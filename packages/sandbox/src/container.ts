import { execSync } from "node:child_process";
import type { SandboxBackend, SpawnConfig } from "./index.js";

type Runtime = "yolobox" | "podman" | "docker";

export class ContainerBackend implements SandboxBackend {
  readonly level = 2 as const;
  readonly name = "Container";

  private runtime: Runtime | null = null;
  private readonly image = "ghcr.io/supermuschel/agent-runtime:latest";

  constructor(private readonly projectPath: string) {}

  private detectRuntime(): Runtime | null {
    for (const rt of ["yolobox", "podman", "docker"] as Runtime[]) {
      try {
        execSync(`which ${rt}`, { stdio: "ignore" });
        return rt;
      } catch {}
    }
    return null;
  }

  async available(): Promise<boolean> {
    this.runtime = this.detectRuntime();
    return this.runtime !== null;
  }

  wrapSpawn(config: SpawnConfig): SpawnConfig {
    const runtime = this.runtime ?? this.detectRuntime();
    if (!runtime) throw new Error("No container runtime found");

    if (runtime === "yolobox") {
      return {
        cmd: "yolobox",
        args: [config.cmd, ...config.args],
        opts: { ...config.opts, cwd: this.projectPath },
      };
    }

    const baseCmd = runtime === "podman" ? "podman" : "docker";
    return {
      cmd: baseCmd,
      args: [
        "run",
        "--rm",
        "-i",
        "-v",
        `${this.projectPath}:${this.projectPath}`,
        "--workdir",
        this.projectPath,
        "--network",
        "host",
        this.image,
        config.cmd,
        ...config.args,
      ],
      opts: config.opts,
    };
  }
}
