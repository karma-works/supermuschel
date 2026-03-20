import { homedir } from "node:os";
import { z } from "zod";
import { SandboxLevelSchema } from "@supermuschel/shared";
import { SandboxManager } from "@supermuschel/sandbox";
import { t } from "./trpc.js";

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
      const levels = [0, 1, 2] as const;
      const results = await Promise.all(
        levels.map(async (level) => ({
          level,
          available: await manager.isAvailable(level),
          name: manager.getBackend(level).name,
        })),
      );
      return results;
    }),

  /** Rich per-level diagnosis with fix instructions. */
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
});
