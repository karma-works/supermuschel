import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseTOML } from "smol-toml";
import { SandboxProfileSchema, type SandboxProfile } from "@supermuschel/shared";

export function loadSandboxProfile(projectRoot: string): SandboxProfile | null {
  const profilePath = path.join(projectRoot, ".supermuschel", "sandbox.toml");
  if (!existsSync(profilePath)) return null;
  try {
    const raw = parseTOML(readFileSync(profilePath, "utf8"));
    const result = SandboxProfileSchema.safeParse(raw);
    if (!result.success) {
      console.warn("[sandbox] sandbox.toml validation failed:", result.error.message);
      return null;
    }
    return result.data;
  } catch (err) {
    console.warn("[sandbox] Failed to parse sandbox.toml:", err);
    return null;
  }
}
