import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Workspace } from "@supermuschel/shared";
import { AgentTypeSchema, SandboxLevelSchema } from "@supermuschel/shared";
import { t } from "../trpc.js";

function rowToWorkspace(row: Record<string, unknown>): Workspace {
  return {
    id: row.id as string,
    name: row.name as string,
    projectPath: row.project_path as string,
    agentType: row.agent_type as Workspace["agentType"],
    sandboxLevel: row.sandbox_level as number,
    sandboxConfig: row.sandbox_config ? JSON.parse(row.sandbox_config as string) : null,
    statusBadges: row.status_badges ? JSON.parse(row.status_badges as string) : null,
    progress: row.progress as number | null,
    createdAt: row.created_at ? new Date(row.created_at as number) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at as number) : null,
  };
}

export const workspaceRouter = t.router({
  list: t.procedure.query(({ ctx }) => {
    const rows = ctx.db.prepare("SELECT * FROM workspaces ORDER BY created_at DESC").all() as Record<string, unknown>[];
    return rows.map(rowToWorkspace);
  }),

  get: t.procedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const row = ctx.db.prepare("SELECT * FROM workspaces WHERE id = ?").get(input.id) as Record<string, unknown> | undefined;
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: `Workspace ${input.id} not found` });
      return rowToWorkspace(row);
    }),

  create: t.procedure
    .input(z.object({
      name: z.string(),
      projectPath: z.string(),
      agentType: AgentTypeSchema,
      sandboxLevel: SandboxLevelSchema.default(1),
    }))
    .mutation(({ ctx, input }) => {
      const id = randomUUID();
      const now = Date.now();
      ctx.db
        .prepare("INSERT INTO workspaces (id, name, project_path, agent_type, sandbox_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(id, input.name, input.projectPath, input.agentType, input.sandboxLevel, now, now);
      const row = ctx.db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id) as Record<string, unknown>;
      return rowToWorkspace(row);
    }),

  update: t.procedure
    .input(z.object({
      id: z.string(),
      name: z.string().optional(),
      sandboxLevel: SandboxLevelSchema.optional(),
      sandboxConfig: z.record(z.unknown()).optional(),
      statusBadges: z.record(z.object({ value: z.string(), icon: z.string().optional() })).optional(),
      progress: z.number().min(0).max(1).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { id, ...updates } = input;
      const sets: string[] = ["updated_at = ?"];
      const vals: unknown[] = [Date.now()];

      if (updates.name !== undefined) { sets.push("name = ?"); vals.push(updates.name); }
      if (updates.sandboxLevel !== undefined) { sets.push("sandbox_level = ?"); vals.push(updates.sandboxLevel); }
      if (updates.sandboxConfig !== undefined) { sets.push("sandbox_config = ?"); vals.push(JSON.stringify(updates.sandboxConfig)); }
      if (updates.statusBadges !== undefined) { sets.push("status_badges = ?"); vals.push(JSON.stringify(updates.statusBadges)); }
      if (updates.progress !== undefined) { sets.push("progress = ?"); vals.push(updates.progress); }

      vals.push(id);
      ctx.db.prepare(`UPDATE workspaces SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
      const row = ctx.db.prepare("SELECT * FROM workspaces WHERE id = ?").get(id) as Record<string, unknown>;
      return rowToWorkspace(row);
    }),

  delete: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      ctx.db.prepare("DELETE FROM workspaces WHERE id = ?").run(input.id);
      return { success: true };
    }),

  /** Electron only: opens a native folder picker dialog. */
  pickDirectory: t.procedure.mutation(async ({ ctx }) => {
    if (!ctx.dialogPicker) {
      throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "pickDirectory requires the desktop app" });
    }
    return ctx.dialogPicker();
  }),

  /** Web server only: list immediate subdirectories within --workdir. */
  listSubdirs: t.procedure
    .input(z.object({ path: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.workdir) {
        throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "listSubdirs requires --workdir server mode" });
      }
      const base = input.path ? path.resolve(ctx.workdir, input.path) : ctx.workdir;
      // Security: ensure resolved path stays within workdir
      if (!base.startsWith(ctx.workdir)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Path escapes workdir boundary" });
      }
      const entries = await readdir(base, { withFileTypes: true });
      return {
        current: base,
        entries: entries
          .filter((e) => e.isDirectory() && !e.name.startsWith("."))
          .map((e) => ({ name: e.name, path: path.join(base, e.name) })),
      };
    }),

  recentProjects: t.procedure.query(({ ctx }) => {
    const rows = ctx.db
      .prepare("SELECT DISTINCT project_path FROM workspaces ORDER BY created_at DESC LIMIT 10")
      .all() as { project_path: string }[];
    return rows.map((r) => r.project_path);
  }),
});
