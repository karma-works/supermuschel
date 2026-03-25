import { z } from "zod";

export const SandboxLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
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

// ─── Sondera / Policy sandbox ─────────────────────────────────────────────────

/**
 * The Ollama model to use for the LLM classifier.
 * "full"     → pull gpt-oss-safeguard-20b directly (~12 GB)
 * "phi4-mini" → pull phi4-mini and alias as gpt-oss-safeguard:20b (~2.5 GB)
 * "qwen2.5:3b" → pull qwen2.5:3b and alias (~2 GB)
 * "llama3.2:3b" → pull llama3.2:3b and alias (~2 GB)
 * custom:<name> → pull <name> and alias
 */
export const SonderaModelChoiceSchema = z.string().min(1);
export type SonderaModelChoice = z.infer<typeof SonderaModelChoiceSchema>;

/** The canonical alias name sondera-harness-server always expects. */
export const SONDERA_HARNESS_MODEL_ALIAS = "gpt-oss-safeguard:20b";

/** Well-known preset options shown in the wizard. */
export const SONDERA_MODEL_PRESETS = [
  {
    id: "full" as const,
    label: "Full",
    ollamaModel: "gpt-oss-safeguard-20b",
    needsAlias: false,
    sizeGb: 12,
    description: "The model purpose-built for security classification. Best accuracy.",
  },
  {
    id: "phi4-mini" as const,
    label: "Balanced",
    ollamaModel: "phi4-mini",
    needsAlias: true,
    sizeGb: 2.5,
    description: "Microsoft Phi-4 Mini. Strong reasoning, fast on Apple Silicon.",
    recommended: true,
  },
  {
    id: "qwen2.5:3b" as const,
    label: "Lite",
    ollamaModel: "qwen2.5:3b",
    needsAlias: true,
    sizeGb: 2,
    description: "Qwen 2.5 3B. Smallest option, fastest startup.",
  },
  {
    id: "llama3.2:3b" as const,
    label: "Llama",
    ollamaModel: "llama3.2:3b",
    needsAlias: true,
    sizeGb: 2,
    description: "Meta Llama 3.2 3B. Widely tested, good general capability.",
  },
] as const;

export const SonderaInstallStatusSchema = z.object({
  installed: z.boolean(),
  version: z.string().nullable(),
  /** null = LLM disabled, string = model id that was configured */
  modelChoice: z.string().nullable(),
  harnessRunning: z.boolean(),
});
export type SonderaInstallStatus = z.infer<typeof SonderaInstallStatusSchema>;

export const SonderaInstallStepSchema = z.enum([
  "download",
  "checksum",
  "extract",
  "policies",
  "ollama_check",
  "ollama_pull",
  "ollama_alias",
  "hooks",
  "done",
  "error",
]);
export type SonderaInstallStep = z.infer<typeof SonderaInstallStepSchema>;

export const SonderaInstallEventSchema = z.object({
  step: SonderaInstallStepSchema,
  status: z.enum(["pending", "running", "done", "error"]),
  message: z.string(),
  progress: z.number().min(0).max(1).optional(),
  /** Full error details (stderr, stack) shown in the error modal */
  errorDetail: z.string().optional(),
  /** Manual fix instructions */
  fixInstructions: z.string().optional(),
});
export type SonderaInstallEvent = z.infer<typeof SonderaInstallEventSchema>;

export const HarnessHealthSchema = z.object({
  running: z.boolean(),
  pid: z.number().nullable(),
  uptimeMs: z.number().nullable(),
  socketPath: z.string(),
});
export type HarnessHealth = z.infer<typeof HarnessHealthSchema>;
