import { execSync } from "node:child_process";
import { basename } from "node:path";
import type { SandboxBackend, SandboxDiagnosis, SpawnConfig } from "./index.js";

type Runtime = "yolobox" | "podman" | "docker";

export class ContainerBackend implements SandboxBackend {
  readonly level = 2 as const;
  readonly name = "Container";

  private runtime: Runtime | null = null;
  private readonly image = "ghcr.io/supermuschel/agent-runtime:latest";

  constructor(private readonly projectPath: string) {}

  getRuntime(): Runtime | null {
    return this.runtime ?? this.detectRuntime();
  }

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
    const d = await this.diagnose();
    return d.available;
  }

  async diagnose(): Promise<Omit<SandboxDiagnosis, "level" | "name">> {
    this.runtime = this.detectRuntime();
    if (this.runtime) {
      return { available: true, fixable: false };
    }
    const isMac = process.platform === "darwin";
    return {
      available: false,
      reason:
        "No container runtime found. Supermuschel needs Docker Desktop, Podman, or yolobox installed and on your PATH to use container isolation.",
      fixable: true,
      fixLabel: isMac ? "Install Docker Desktop" : "Docker install instructions",
      fixUrl: isMac
        ? "https://www.docker.com/products/docker-desktop/"
        : "https://docs.docker.com/engine/install/",
    };
  }

  wrapSpawn(config: SpawnConfig): SpawnConfig {
    const runtime = this.runtime ?? this.detectRuntime();
    if (!runtime) throw new Error("No container runtime found");

    if (runtime === "yolobox") {
      return {
        cmd: "yolobox",
        args: [basename(config.cmd), ...config.args],
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
