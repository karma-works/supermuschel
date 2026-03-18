import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxBackend, SpawnConfig } from "./index.js";

const PROFILE_TEMPLATE_PATH = join(__dirname, "../../profiles/seatbelt-default.sb");

export class SeatbeltBackend implements SandboxBackend {
  readonly level = 1 as const;
  readonly name = "macOS Seatbelt";

  private profilePath: string | null = null;

  constructor(
    private readonly projectPath: string,
    private readonly homePath: string,
  ) {}

  async available(): Promise<boolean> {
    try {
      execSync("which sandbox-exec", { stdio: "ignore" });
      // macOS only
      execSync("sw_vers", { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  }

  private ensureProfile(): string {
    if (this.profilePath) return this.profilePath;

    const template = readFileSync(PROFILE_TEMPLATE_PATH, "utf8");
    const profile = template
      .replaceAll("{{PROJECT_PATH}}", this.projectPath)
      .replaceAll("{{HOME_PATH}}", this.homePath);

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
