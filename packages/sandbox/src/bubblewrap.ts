import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxBackend, SandboxDiagnosis, SpawnConfig } from "./index.js";

// Candidate home-relative directories to bind writably, beyond the project
// and standard tmp paths. Checked with existsSync so we never pass a
// non-existent path to bwrap (which would error out).
const EXTRA_WRITE_CANDIDATES = [
  ".local",
  ".config",
  ".cache",
];

export class BubblewrapBackend implements SandboxBackend {
  readonly level = 1 as const;
  readonly name = "Linux Bubblewrap";

  constructor(
    private readonly projectPath: string,
    private readonly homePath: string,
  ) {}

  async available(): Promise<boolean> {
    const d = await this.diagnose();
    return d.available;
  }

  async diagnose(): Promise<Omit<SandboxDiagnosis, "level" | "name">> {
    if (process.platform !== "linux") {
      return {
        available: false,
        reason:
          "Linux Bubblewrap only works on Linux. You're running on a different operating system. Use None (no sandboxing) or Container isolation instead.",
        fixable: false,
      };
    }
    try {
      execSync("which bwrap", { stdio: "ignore" });
      return { available: true, fixable: false };
    } catch {
      return {
        available: false,
        reason:
          "bwrap (Bubblewrap) not found. Install it via your package manager: apt install bubblewrap / dnf install bubblewrap / pacman -S bubblewrap",
        fixable: true,
        fixLabel: "Bubblewrap docs",
        fixUrl: "https://github.com/containers/bubblewrap",
      };
    }
  }

  wrapSpawn(config: SpawnConfig): SpawnConfig {
    // Build writable bind-mounts for extra dirs that exist on this machine.
    // bwrap errors on non-existent paths, so we guard with existsSync.
    const extraBinds = EXTRA_WRITE_CANDIDATES
      .map((rel) => join(this.homePath, rel))
      .filter(existsSync)
      .flatMap((p) => ["--bind", p, p]);

    // Bubblewrap args:
    //   --ro-bind / /          bind root read-only (security boundary is writes)
    //   --dev /dev             expose device nodes (needed for ptys, /dev/null, etc.)
    //   --proc /proc           expose proc fs (required by many tools)
    //   --tmpfs /tmp           writable tmp inside sandbox
    //   --bind <proj> <proj>   project dir writable (the workspace)
    //   --bind <xdg>  <xdg>    XDG dirs writable (tool databases, caches, configs)
    //   --bind $HOME/.claude   Claude Code state dir writable
    //   Network is NOT unshared — agents need API access.
    const claudeDir = join(this.homePath, ".claude");
    const bwrapArgs = [
      "--ro-bind", "/", "/",
      "--dev", "/dev",
      "--proc", "/proc",
      "--tmpfs", "/tmp",
      "--tmpfs", tmpdir(),
      "--bind", this.projectPath, this.projectPath,
      ...extraBinds,
      ...(existsSync(claudeDir) ? ["--bind", claudeDir, claudeDir] : []),
      "--",
      config.cmd,
      ...config.args,
    ];

    return {
      cmd: "bwrap",
      args: bwrapArgs,
      opts: config.opts,
    };
  }
}
