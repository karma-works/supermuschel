import { z } from "zod";

export const SandboxProfileSchema = z.object({
  version: z.literal(1),
  level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  extra_writable_paths: z.array(z.string()).default([]),
  extra_blocked_paths: z.array(z.string()).default([]),
});
export type SandboxProfile = z.infer<typeof SandboxProfileSchema>;
