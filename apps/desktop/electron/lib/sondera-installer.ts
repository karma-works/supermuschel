import { copyFile, chmod, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { app } from "electron";

const execFileAsync = promisify(execFile);

// ─── Install locations ────────────────────────────────────────────────────────

const INSTALL_BIN_DIR = path.join(homedir(), ".supermuschel", "bin");
const INSTALL_POLICIES_DIR = path.join(homedir(), ".supermuschel", "policies");
const HARNESS_BIN = path.join(INSTALL_BIN_DIR, "sondera-harness-server");
const CLAUDE_BIN = path.join(INSTALL_BIN_DIR, "sondera-claude");

export function getHarnessBin(): string {
  return HARNESS_BIN;
}

export function isSonderaInstalled(): boolean {
  return existsSync(HARNESS_BIN) && existsSync(CLAUDE_BIN);
}

// ─── Binary + policy installation ────────────────────────────────────────────

type InstallProgress =
  | { phase: "copy"; message?: string }
  | { phase: "policies"; message?: string };

export async function installSonderaBinaries(
  onProgress: (p: InstallProgress) => void,
): Promise<void> {
  const resourcesPath = (process as NodeJS.Process & { resourcesPath: string }).resourcesPath;
  const srcBinDir = app.isPackaged
    ? path.join(resourcesPath, "bin")
    : path.resolve(__dirname, "../../../../../apps/desktop/resources/bin");
  const srcPoliciesDir = app.isPackaged
    ? path.join(resourcesPath, "policies")
    : path.resolve(__dirname, "../../../../../apps/desktop/resources/policies");

  await mkdir(INSTALL_BIN_DIR, { recursive: true });
  await mkdir(INSTALL_POLICIES_DIR, { recursive: true });

  // Copy binaries
  onProgress({ phase: "copy", message: "Copying sondera binaries…" });
  for (const bin of ["sondera-harness-server", "sondera-claude"]) {
    const src = path.join(srcBinDir, bin);
    const dest = path.join(INSTALL_BIN_DIR, bin);
    if (!existsSync(src)) {
      throw new Error(`Bundled binary not found: ${src}`);
    }
    await copyFile(src, dest);
    await chmod(dest, 0o755);
  }

  // Copy policies (never overwrite existing customisations)
  onProgress({ phase: "policies", message: "Installing default policies…" });
  if (existsSync(srcPoliciesDir)) {
    const files = await readdir(srcPoliciesDir);
    for (const file of files) {
      const dest = path.join(INSTALL_POLICIES_DIR, file);
      if (!existsSync(dest)) {
        await copyFile(path.join(srcPoliciesDir, file), dest);
      }
    }
  }
}

// ─── Project-level hook management ───────────────────────────────────────────
//
// Hooks are written to {projectPath}/.claude/settings.json (project scope) so
// they do not pollute the user's global ~/.claude/settings.json.
// We delegate to `sondera-claude install --project` / `uninstall --project`
// which writes the correct subcommand-based hook entries that the binary expects.

/**
 * Install Sondera hooks into the project-level .claude/settings.json.
 * Runs `sondera-claude install --project` in the project directory.
 *
 * @param projectPath  Absolute path to the workspace root.
 * @param _socketPath  Unused — the binary locates the harness socket itself.
 */
export async function installHooks(projectPath: string, _socketPath?: string): Promise<void> {
  if (!existsSync(CLAUDE_BIN)) {
    throw new Error(`sondera-claude binary not found at ${CLAUDE_BIN}. Re-run the Policy sandbox setup.`);
  }
  await mkdir(path.join(projectPath, ".claude"), { recursive: true });
  await execFileAsync(CLAUDE_BIN, ["install", "--project"], { cwd: projectPath });
}

/**
 * Remove Sondera hooks from the project-level .claude/settings.json.
 * Runs `sondera-claude uninstall --project` in the project directory.
 * Safe to call even if the file does not exist.
 */
export async function uninstallHooks(projectPath: string): Promise<void> {
  if (!existsSync(CLAUDE_BIN)) return;
  const settingsPath = path.join(projectPath, ".claude", "settings.json");
  if (!existsSync(settingsPath)) return;
  await execFileAsync(CLAUDE_BIN, ["uninstall", "--project"], { cwd: projectPath }).catch(
    (e) => console.warn("[sondera] uninstall hooks:", e.message),
  );
}

// ─── Ollama helpers ───────────────────────────────────────────────────────────

export async function checkOllamaInstalled(): Promise<{
  installed: boolean;
  version?: string;
}> {
  try {
    const { stdout } = await execFileAsync("ollama", ["--version"]);
    return { installed: true, version: stdout.trim() };
  } catch {
    return { installed: false };
  }
}

export async function createOllamaAlias(
  baseModel: string,
  onLine: (line: string) => void,
): Promise<void> {
  const { SONDERA_HARNESS_MODEL_ALIAS } = await import("@supermuschel/shared");
  const modelfile = `FROM ${baseModel}\n`;
  const { spawn } = await import("node:child_process");
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ollama", ["create", SONDERA_HARNESS_MODEL_ALIAS, "-"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    proc.stdin.end(modelfile);
    proc.stdout.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n")) {
        if (line.trim()) onLine(line.trim());
      }
    });
    proc.stderr.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n")) {
        if (line.trim()) onLine(line.trim());
      }
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ollama create exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}
