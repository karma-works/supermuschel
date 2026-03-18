import { z } from "zod";

export const SandboxLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type SandboxLevel = z.infer<typeof SandboxLevelSchema>;

export const AgentTypeSchema = z.enum(["claude", "opencode"]);
export type AgentType = z.infer<typeof AgentTypeSchema>;

export const WorkspaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  projectPath: z.string(),
  agentType: AgentTypeSchema,
  sandboxLevel: SandboxLevelSchema,
  sandboxConfig: z.record(z.unknown()).optional(),
  statusBadges: z.record(z.object({ value: z.string(), icon: z.string().optional() })).optional(),
  progress: z.number().min(0).max(1).optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type WorkspaceData = z.infer<typeof WorkspaceSchema>;

export const AgentStatusSchema = z.enum(["starting", "running", "stopped", "crashed", "idle"]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const SandboxStatusSchema = z.object({
  level: SandboxLevelSchema,
  available: z.boolean(),
  reason: z.string().optional(),
});
export type SandboxStatus = z.infer<typeof SandboxStatusSchema>;

export const UIEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("set-status"),
    workspaceId: z.string(),
    key: z.string(),
    value: z.string(),
    icon: z.string().optional(),
  }),
  z.object({
    type: z.literal("set-progress"),
    workspaceId: z.string(),
    progress: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal("notify"),
    workspaceId: z.string(),
    title: z.string(),
    body: z.string(),
  }),
  z.object({
    type: z.literal("trigger-flash"),
    workspaceId: z.string(),
  }),
]);
export type UIEvent = z.infer<typeof UIEventSchema>;
