import type { SandboxBackend, SpawnConfig } from "./index.js";

export class NoneBackend implements SandboxBackend {
  readonly level = 0 as const;
  readonly name = "None";

  async available(): Promise<boolean> {
    return true;
  }

  wrapSpawn(config: SpawnConfig): SpawnConfig {
    return config;
  }
}
