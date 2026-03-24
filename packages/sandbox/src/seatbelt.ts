import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SandboxBackend, SandboxDiagnosis, SpawnConfig } from "./index.js";

const PROFILE_TEMPLATE_PATH = join(__dirname, "../profiles/seatbelt-default.sb");

// Candidate directories to allow writes to, beyond the hard-coded ones.
// Each is checked with existsSync before being added to the profile — a
// (subpath ...) rule referencing a non-existent path causes SIGABRT.
//
// Security note: ~/.ssh, ~/.aws, ~/.gitconfig etc. sit OUTSIDE every subtree
// listed here, so they remain protected even with these additions.
const EXTRA_WRITE_CANDIDATES = [
  // XDG directories — used by OpenCode (SQLite DB), and many Linux-ported tools
  ".local",               // ~/.local/share/opencode, ~/.local/state/…
  ".config",              // ~/.config/<tool>/
  ".cache",               // ~/.cache/<tool>/
  // macOS Library — used by Node.js, Electron helpers, and some CLI tools
  // on macOS for caches and app-support data
  join("Library", "Caches"),
  join("Library", "Application Support"),
];

export class SeatbeltBackend implements SandboxBackend {
  readonly level = 1 as const;
  readonly name = "macOS Seatbelt";

  private profilePath: string | null = null;

  constructor(
    private readonly projectPath: string,
    private readonly homePath: string,
  ) {}

  getProfilePath(): string | null { return this.profilePath; }

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

    // Build optional write rules only for directories that actually exist.
    // Non-existent paths in (subpath ...) rules cause SIGABRT from sandbox-exec.
    const extraWritePaths = EXTRA_WRITE_CANDIDATES
      .map((rel) => join(this.homePath, rel))
      .filter(existsSync)
      .map((p) => `(allow file-write* (subpath "${p}"))`)
      .join("\n");

    const template = readFileSync(PROFILE_TEMPLATE_PATH, "utf8");
    const profile = template
      .replaceAll("{{PROJECT_PATH}}", this.projectPath)
      .replaceAll("{{HOME_PATH}}", this.homePath)
      .replaceAll("{{TMPDIR}}", tmpdirClean)
      .replaceAll("{{EXTRA_WRITE_PATHS}}", extraWritePaths);

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
