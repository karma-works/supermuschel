import { homedir } from "node:os";
import { observable } from "@trpc/server/observable";
import { z } from "zod";
import type { FileEvent } from "@supermuschel/shared";
import { SandboxLevelSchema } from "@supermuschel/shared";
import { SandboxManager, deriveZones } from "@supermuschel/sandbox";
import { t } from "../trpc.js";

export const sandboxRouter = t.router({
  getStatus: t.procedure
    .input(z.object({ projectPath: z.string(), level: SandboxLevelSchema }))
    .query(async ({ input }) => {
      const manager = new SandboxManager(input.projectPath, homedir());
      const available = await manager.isAvailable(input.level);
      return {
        level: input.level,
        available,
        name: manager.getBackend(input.level).name,
      };
    }),

  getAllAvailability: t.procedure
    .input(z.object({ projectPath: z.string() }))
    .query(async ({ input }) => {
      const manager = new SandboxManager(input.projectPath, homedir());
      const levels = [0, 1, 2, 4] as const;
      const results = await Promise.all(
        levels.map(async (level) => ({
          level,
          available: await manager.isAvailable(level),
          name: manager.getBackend(level).name,
        })),
      );
      return results;
    }),

  getRequirements: t.procedure
    .input(z.object({ projectPath: z.string() }))
    .query(async ({ input }) => {
      const manager = new SandboxManager(input.projectPath, homedir());
      return manager.diagnoseAll();
    }),

  testIsolation: t.procedure
    .input(z.object({ projectPath: z.string(), level: SandboxLevelSchema }))
    .mutation(async ({ input }) => {
      const manager = new SandboxManager(input.projectPath, homedir());
      const available = await manager.isAvailable(input.level);
      if (!available) return { success: false, reason: "Backend not available" };
      try {
        manager.wrapSpawn(input.level, { cmd: "echo", args: ["test"], opts: {} });
        return { success: true };
      } catch (err) {
        return { success: false, reason: String(err) };
      }
    }),

  getEvents: t.procedure
    .input(z.object({
      agentId: z.string(),
      eventType: z.enum(["write", "blocked", "all"]).default("all"),
      limit: z.number().int().min(1).max(10000).default(2000),
    }))
    .query(({ ctx, input }) => {
      const rows =
        input.eventType === "all"
          ? (ctx.db
              .prepare("SELECT event_type, path, ts FROM sandbox_events WHERE agent_id = ? ORDER BY ts ASC LIMIT ?")
              .all(input.agentId, input.limit) as { event_type: string; path: string; ts: number }[])
          : (ctx.db
              .prepare("SELECT event_type, path, ts FROM sandbox_events WHERE agent_id = ? AND event_type = ? ORDER BY ts ASC LIMIT ?")
              .all(input.agentId, input.eventType, input.limit) as { event_type: string; path: string; ts: number }[]);
      return rows.map((r) => ({ type: r.event_type as "write" | "blocked", path: r.path, ts: r.ts }));
    }),

  getZones: t.procedure
    .input(z.object({ agentId: z.string() }))
    .query(({ ctx, input }) => {
      const agent = ctx.agentManager.getAgent(input.agentId);
      if (!agent) return { writable: [], readOnly: [], blocked: [] };
      let seatbeltProfilePath: string | null = null;
      if (process.platform === "darwin" && agent.sandboxLevel === 1) {
        const backend = agent.sandboxManager.getBackend(1) as { getProfilePath?: () => string | null };
        seatbeltProfilePath = backend.getProfilePath?.() ?? null;
      }
      return deriveZones(agent.sandboxLevel, null, agent.cwd, seatbeltProfilePath);
    }),

  fileEvents: t.procedure
    .input(z.object({ agentId: z.string() }))
    .subscription(({ ctx, input }) => {
      return observable<FileEvent>((emit) => {
        const insertStmt = ctx.db.prepare(
          "INSERT INTO sandbox_events (agent_id, workspace_id, event_type, path, ts) VALUES (?, ?, ?, ?, ?)",
        );
        const unsub = ctx.agentManager.onFileEvent(input.agentId, (event) => {
          const agent = ctx.agentManager.getAgent(input.agentId);
          try {
            insertStmt.run(input.agentId, agent?.workspaceId ?? "", event.type, event.path, event.ts);
          } catch (err) {
            console.warn("[sandbox] Failed to persist file event:", err);
          }
          emit.next(event);
        });
        return () => unsub();
      });
    }),

});
