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

export interface SandboxBackend {
  readonly level: SandboxLevel;
  readonly name: string;
  available(): Promise<boolean>;
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

  wrapSpawn(level: SandboxLevel, config: SpawnConfig): SpawnConfig {
    return this.getBackend(level).wrapSpawn(config);
  }
}

export { NoneBackend, SeatbeltBackend, ContainerBackend };
