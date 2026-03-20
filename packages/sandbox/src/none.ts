import type { SandboxBackend, SandboxDiagnosis, SpawnConfig } from "./index.js";

export class NoneBackend implements SandboxBackend {
  readonly level = 0 as const;
  readonly name = "None";

  async available(): Promise<boolean> {
    return true;
  }

  async diagnose(): Promise<Omit<SandboxDiagnosis, "level" | "name">> {
    return { available: true, fixable: false };
  }

  wrapSpawn(config: SpawnConfig): SpawnConfig {
    return config;
  }
}
