import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import type { SandboxBackend, SandboxDiagnosis, SpawnConfig } from "./index.js";

function generatePolicy(projectPath: string, homePath: string): string {
  const claudeDir = join(homePath, ".claude");
  const lines = [
    "version: 1",
    "filesystem_policy:",
    "  read_only:",
    "    - /usr",
    "    - /etc",
    "    - /lib",
    "    - /bin",
    "    - /sbin",
    "  read_write:",
    `    - ${projectPath}`,
    "    - /tmp",
    ...(existsSync(claudeDir) ? [`    - ${claudeDir}`] : []),
    "landlock:",
    "  compatibility: best_effort",
    "process:",
    "  user: sandbox",
    "  group: sandbox",
  ];
  return `${lines.join("\n")}\n`;
}

export class OpenShellBackend implements SandboxBackend {
  readonly level = 4 as const;
  readonly name = "OpenShell";

  private policyPath: string | null = null;
  private policyDir: string | null = null;

  constructor(
    private readonly projectPath: string,
    private readonly homePath: string,
  ) {}

  async diagnose(): Promise<Omit<SandboxDiagnosis, "level" | "name">> {
    if (process.platform === "win32") {
      return {
        available: false,
        reason: "OpenShell is not supported on Windows.",
        fixable: false,
      };
    }
    try {
      execSync("which openshell", { stdio: "ignore" });
    } catch {
      return {
        available: false,
        reason:
          "openshell not found. Install via: curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh",
        fixable: true,
        fixLabel: "OpenShell on GitHub",
        fixUrl: "https://github.com/NVIDIA/OpenShell",
      };
    }
    try {
      execSync("docker info", { stdio: "ignore", timeout: 3000 });
    } catch {
      return {
        available: false,
        reason:
          "Docker is not running. OpenShell requires Docker Engine. Start Docker Desktop or the Docker daemon and try again.",
        fixable: false,
      };
    }
    return { available: true, fixable: false };
  }

  async available(): Promise<boolean> {
    return (await this.diagnose()).available;
  }

  private ensurePolicy(): string {
    if (this.policyPath) return this.policyPath;
    const tmpDir = mkdtempSync(join(tmpdir(), "sm-os-"));
    const p = join(tmpDir, "openshell-policy.yaml");
    writeFileSync(p, generatePolicy(this.projectPath, this.homePath), {
      mode: 0o600,
    });
    this.policyDir = tmpDir;
    this.policyPath = p;
    return p;
  }

  wrapSpawn(config: SpawnConfig): SpawnConfig {
    const policyPath = this.ensurePolicy();
    // OpenShell takes the agent binary name (not full path) after the -- separator.
    // It provisions the agent inside the sandbox container.
    const agentBin = basename(config.cmd);
    return {
      cmd: "openshell",
      args: [
        "sandbox",
        "create",
        "--policy",
        policyPath,
        "--",
        agentBin,
        ...config.args,
      ],
      opts: config.opts,
    };
  }

  async cleanup(): Promise<void> {
    if (this.policyDir) {
      try {
        rmSync(this.policyDir, { recursive: true, force: true });
      } catch {}
    }
    this.policyDir = null;
    this.policyPath = null;
  }
}
