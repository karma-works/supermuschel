import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import type { SandboxLevel } from "@supermuschel/shared";
import type { SandboxProfile, SandboxZones } from "@supermuschel/shared";

export function deriveZones(
  level: SandboxLevel,
  profile: SandboxProfile | null,
  projectRoot: string,
  seatbeltProfilePath?: string | null,
): SandboxZones {
  if (level === 0) return { writable: [], readOnly: [], blocked: [] };
  if (level >= 2) return { writable: [], readOnly: [], blocked: [] };

  const extraWritable = profile?.extra_writable_paths ?? [];
  const extraBlocked = profile?.extra_blocked_paths ?? [];
  const defaultReadOnly = ["/usr", "/etc", "/lib", "/bin", "/sbin"];
  const home = homedir();

  if (process.platform === "linux") {
    return {
      writable: [projectRoot, ...extraWritable],
      readOnly: defaultReadOnly,
      blocked: [home, ...extraBlocked],
    };
  }

  // macOS: try to parse the seatbelt profile
  let writable = [projectRoot];
  if (seatbeltProfilePath) {
    try {
      const sbContent = readFileSync(seatbeltProfilePath, "utf8");
      // NOTE: Regex targets Supermuschel-controlled profile format only.
      // Multi-path block format typically yields zero matches — fallback to [projectRoot] is correct.
      const matches = [...sbContent.matchAll(/\(allow file-write\*\s+\(subpath\s+"([^"]+)"\)/g)].map((m) => m[1]);
      if (matches.length > 0) writable = matches;
    } catch {
      // ignore parse errors — fallback to [projectRoot]
    }
  }

  return {
    writable: [...writable, ...extraWritable],
    readOnly: defaultReadOnly,
    blocked: [home],
  };
}
