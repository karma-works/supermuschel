import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxBackend, SandboxDiagnosis, SpawnConfig } from "./index.js";

const PROFILE_TEMPLATE_PATH = join(__dirname, "../profiles/seatbelt-default.sb");

export class SeatbeltBackend implements SandboxBackend {
  readonly level = 1 as const;
  readonly name = "macOS Seatbelt";

  private profilePath: string | null = null;

  constructor(
    private readonly projectPath: string,
    private readonly homePath: string,
  ) {}

  async available(): Promise<boolean> {
    const d = await this.diagnose();
    return d.available;
  }

  async diagnose(): Promise<Omit<SandboxDiagnosis, "level" | "name">> {
    if (process.platform !== "darwin") {
      return {
        available: false,
        reason:
          "macOS Seatbelt only works on macOS. You're running on a different operating system. Use None (no sandboxing) or Container isolation instead.",
        fixable: false,
      };
    }
    try {
      execSync("which sandbox-exec", { stdio: "ignore" });
      return { available: true, fixable: false };
    } catch {
      return {
        available: false,
        reason:
          "sandbox-exec not found. This tool ships with macOS and should always be present — your macOS installation may be incomplete.",
        fixable: false,
      };
    }
  }

  private ensureProfile(): string {
    if (this.profilePath) return this.profilePath;

    // $TMPDIR on macOS is /var/folders/…/T/ — strip trailing slash so
    // sandbox-exec doesn't receive an empty subpath pattern.
    const tmpdirClean = (process.env.TMPDIR ?? tmpdir()).replace(/\/$/, "");

    const template = readFileSync(PROFILE_TEMPLATE_PATH, "utf8");
    const profile = template
      .replaceAll("{{PROJECT_PATH}}", this.projectPath)
      .replaceAll("{{HOME_PATH}}", this.homePath)
      .replaceAll("{{TMPDIR}}", tmpdirClean);

    const tmpDir = mkdtempSync(join(tmpdir(), "sm-"));
    const profilePath = join(tmpDir, "profile.sb");
    writeFileSync(profilePath, profile, { mode: 0o600 });

    this.profilePath = profilePath;
    return profilePath;
  }

  wrapSpawn(config: SpawnConfig): SpawnConfig {
    const profilePath = this.ensureProfile();
    return {
      cmd: "sandbox-exec",
      args: ["-f", profilePath, config.cmd, ...config.args],
      opts: config.opts,
    };
  }

  async cleanup(): Promise<void> {
    if (this.profilePath) {
      try {
        rmSync(this.profilePath, { recursive: true, force: true });
      } catch {}
      this.profilePath = null;
    }
  }
}
