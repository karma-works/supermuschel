import type { SpawnOptions } from "node:child_process";
import type { SandboxLevel } from "@supermuschel/shared";
import { ContainerBackend } from "./container.js";
import { NoneBackend } from "./none.js";
import { SeatbeltBackend } from "./seatbelt.js";

export interface SpawnConfig {
  cmd: string;
  args: string[];
  opts: SpawnOptions;
}

export interface SandboxDiagnosis {
  level: SandboxLevel;
  name: string;
  available: boolean;
  /** Human-readable explanation of why it's unavailable (or extra context). */
  reason?: string;
  /** Whether the user can fix this by installing something. */
  fixable: boolean;
  /** Button label for the fix action. */
  fixLabel?: string;
  /** URL to open when the fix button is clicked. */
  fixUrl?: string;
}

export interface SandboxBackend {
  readonly level: SandboxLevel;
  readonly name: string;
  available(): Promise<boolean>;
  diagnose(): Promise<Omit<SandboxDiagnosis, "level" | "name">>;
  wrapSpawn(config: SpawnConfig): SpawnConfig;
  cleanup?(): Promise<void>;
}

export class SandboxManager {
  private backends: Map<SandboxLevel, SandboxBackend> = new Map();

  constructor(projectPath: string, homePath: string) {
    this.backends.set(0, new NoneBackend());
    this.backends.set(1, new SeatbeltBackend(projectPath, homePath));
    this.backends.set(2, new ContainerBackend(projectPath));
  }

  getBackend(level: SandboxLevel): SandboxBackend {
    const backend = this.backends.get(level);
    if (!backend) throw new Error(`Unknown sandbox level: ${level}`);
    return backend;
  }

  async isAvailable(level: SandboxLevel): Promise<boolean> {
    return this.getBackend(level).available();
  }

  async diagnose(level: SandboxLevel): Promise<SandboxDiagnosis> {
    const backend = this.getBackend(level);
    const result = await backend.diagnose();
    return { level, name: backend.name, ...result };
  }

  async diagnoseAll(): Promise<SandboxDiagnosis[]> {
    const levels = [0, 1, 2] as const;
    return Promise.all(levels.map((l) => this.diagnose(l)));
  }

  wrapSpawn(level: SandboxLevel, config: SpawnConfig): SpawnConfig {
    return this.getBackend(level).wrapSpawn(config);
  }

  /** Returns the detected container runtime name, or null if level 2 is unavailable. */
  getContainerRuntime(): string | null {
    return (this.backends.get(2) as ContainerBackend).getRuntime();
  }
}

export { NoneBackend, SeatbeltBackend, ContainerBackend };
