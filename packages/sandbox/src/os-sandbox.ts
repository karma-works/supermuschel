import type { SandboxBackend, SandboxDiagnosis, SpawnConfig } from "./index.js";
import { SeatbeltBackend } from "./seatbelt.js";
import { BubblewrapBackend } from "./bubblewrap.js";

/**
 * OsSandboxBackend — delegates to the appropriate OS-native sandbox:
 *   macOS  → SeatbeltBackend  (sandbox-exec / Apple Seatbelt)
 *   Linux  → BubblewrapBackend (bwrap / Bubblewrap)
 *   other  → unsupported stub
 *
 * This is registered as Level 1 in SandboxManager so callers never
 * need to branch on platform themselves.
 */
export class OsSandboxBackend implements SandboxBackend {
  readonly level = 1 as const;
  readonly name: string;

  private readonly delegate: SandboxBackend;

  constructor(projectPath: string, homePath: string) {
    if (process.platform === "darwin") {
      this.delegate = new SeatbeltBackend(projectPath, homePath);
      this.name = "macOS Seatbelt";
    } else if (process.platform === "linux") {
      this.delegate = new BubblewrapBackend(projectPath, homePath);
      this.name = "Linux Bubblewrap";
    } else {
      this.delegate = new UnsupportedOsSandboxBackend();
      this.name = "OS Sandbox (unsupported platform)";
    }
  }

  available(): Promise<boolean> {
    return this.delegate.available();
  }

  diagnose(): Promise<Omit<SandboxDiagnosis, "level" | "name">> {
    return this.delegate.diagnose();
  }

  wrapSpawn(config: SpawnConfig): SpawnConfig {
    return this.delegate.wrapSpawn(config);
  }

  async cleanup(): Promise<void> {
    await this.delegate.cleanup?.();
  }
}

class UnsupportedOsSandboxBackend implements SandboxBackend {
  readonly level = 1 as const;
  readonly name = "OS Sandbox (unsupported platform)";

  async available(): Promise<boolean> {
    return false;
  }

  async diagnose(): Promise<Omit<SandboxDiagnosis, "level" | "name">> {
    return {
      available: false,
      reason: `OS-native sandboxing is not supported on ${process.platform}. Use None (no sandboxing) or Container isolation instead.`,
      fixable: false,
    };
  }

  wrapSpawn(config: SpawnConfig): SpawnConfig {
    return config;
  }
}
