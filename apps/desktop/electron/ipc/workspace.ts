import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { workspaces } from "@supermuschel/shared";
import { AgentTypeSchema, SandboxLevelSchema } from "@supermuschel/shared";
import { t } from "./trpc.js";

export const workspaceRouter = t.router({
  list: t.procedure.query(async ({ ctx }) => {
    return ctx.db.select().from(workspaces).all();
  }),

  get: t.procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const ws = ctx.db.select().from(workspaces).where(eq(workspaces.id, input.id)).get();
      if (!ws) throw new Error(`Workspace ${input.id} not found`);
      return ws;
    }),

  create: t.procedure
    .input(
      z.object({
        name: z.string(),
        projectPath: z.string(),
        agentType: AgentTypeSchema,
        sandboxLevel: SandboxLevelSchema.default(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();
      const now = new Date();
      const ws = {
        id,
        name: input.name,
        projectPath: input.projectPath,
        agentType: input.agentType,
        sandboxLevel: input.sandboxLevel,
        createdAt: now,
        updatedAt: now,
      };
      ctx.db.insert(workspaces).values(ws).run();
      return ws;
    }),

  update: t.procedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        sandboxLevel: SandboxLevelSchema.optional(),
        sandboxConfig: z.record(z.unknown()).optional(),
        statusBadges: z.record(z.object({ value: z.string(), icon: z.string().optional() })).optional(),
        progress: z.number().min(0).max(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      ctx.db
        .update(workspaces)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(workspaces.id, id))
        .run();
      return ctx.db.select().from(workspaces).where(eq(workspaces.id, id)).get();
    }),

  delete: t.procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      ctx.db.delete(workspaces).where(eq(workspaces.id, input.id)).run();
      return { success: true };
    }),
});
