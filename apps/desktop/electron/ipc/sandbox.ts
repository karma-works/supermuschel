import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { observable } from "@trpc/server/observable";
import { z } from "zod";
import type { FileEvent, SonderaInstallEvent } from "@supermuschel/shared";
import { SandboxLevelSchema } from "@supermuschel/shared";
import { SandboxManager, deriveZones } from "@supermuschel/sandbox";
import { sqlite } from "../db/client.js";
import {
  checkOllamaInstalled,
  createOllamaAlias,
  getHarnessBin,
  installSonderaBinaries,
  isSonderaInstalled,
} from "../lib/sondera-installer.js";
import { SONDERA_MODEL_PRESETS, SONDERA_HARNESS_MODEL_ALIAS } from "@supermuschel/shared";
import { sonderaHarness } from "../agents/sondera.js";
import { t } from "./trpc.js";

export const sandboxRouter = t.router({
  getStatus: t.procedure
    .input(z.object({ projectPath: z.string(), level: SandboxLevelSchema }))
    .query(async ({ input }) => {
      const manager = new SandboxManager(input.projectPath, homedir());
      const available = await manager.isAvailable(input.level);
      return {
        level: input.level,
        available,
        name: manager.getBackend(input.level).name,
      };
    }),

  getAllAvailability: t.procedure
    .input(z.object({ projectPath: z.string() }))
    .query(async ({ input }) => {
      const manager = new SandboxManager(input.projectPath, homedir());
      const levels = [0, 1, 2, 3] as const;
      const results = await Promise.all(
        levels.map(async (level) => ({
          level,
          available: await manager.isAvailable(level),
          name: manager.getBackend(level).name,
        })),
      );
      return results;
    }),

  /** Rich per-level diagnosis with fix instructions. */
  getRequirements: t.procedure
    .input(z.object({ projectPath: z.string() }))
    .query(async ({ input }) => {
      const manager = new SandboxManager(input.projectPath, homedir());
      return manager.diagnoseAll();
    }),

  testIsolation: t.procedure
    .input(z.object({ projectPath: z.string(), level: SandboxLevelSchema }))
    .mutation(async ({ input }) => {
      const manager = new SandboxManager(input.projectPath, homedir());
      const available = await manager.isAvailable(input.level);
      if (!available) return { success: false, reason: "Backend not available" };
      try {
        manager.wrapSpawn(input.level, { cmd: "echo", args: ["test"], opts: {} });
        return { success: true };
      } catch (err) {
        return { success: false, reason: String(err) };
      }
    }),

  getZones: t.procedure
    .input(z.object({ agentId: z.string() }))
    .query(({ ctx, input }) => {
      const agent = ctx.agentManager.getAgent(input.agentId);
      if (!agent) return { writable: [], readOnly: [], blocked: [] };
      let seatbeltProfilePath: string | null = null;
      if (process.platform === "darwin" && agent.sandboxLevel === 1) {
        const backend = agent.sandboxManager.getBackend(1) as { getProfilePath?: () => string | null };
        seatbeltProfilePath = backend.getProfilePath?.() ?? null;
      }
      return deriveZones(agent.sandboxLevel, null, agent.cwd, seatbeltProfilePath);
    }),

  fileEvents: t.procedure
    .input(z.object({ agentId: z.string() }))
    .subscription(({ ctx, input }) => {
      return observable<FileEvent>((emit) => {
        const unsub = ctx.agentManager.onFileEvent(input.agentId, (event) => {
          emit.next(event);
        });
        return () => unsub();
      });
    }),

  sondera: t.router({
    getStatus: t.procedure.query(() => {
      const installed = isSonderaInstalled();
      const row = sqlite
        .prepare("SELECT version, ollama_enabled, model FROM sondera_install ORDER BY id DESC LIMIT 1")
        .get() as { version: string; ollama_enabled: number; model: string | null } | undefined;
      return {
        installed,
        version: row?.version ?? null,
        modelChoice: row?.model ?? null,
        harnessRunning: sonderaHarness.isRunning(),
      };
    }),

    getHarnessHealth: t.procedure.query(() => ({
      running: sonderaHarness.isRunning(),
      pid: sonderaHarness.getPid(),
      uptimeMs: sonderaHarness.getUptimeMs(),
      socketPath: sonderaHarness.getSocketPath(),
    })),

    startHarness: t.procedure.mutation(async () => {
      await sonderaHarness.ensureRunning();
      return { ok: true, socketPath: sonderaHarness.getSocketPath() };
    }),

    stopHarness: t.procedure.mutation(async () => {
      await sonderaHarness.stop();
      return { ok: true };
    }),

    checkOllama: t.procedure.query(async () => {
      return checkOllamaInstalled();
    }),

    /**
     * Full install flow streamed as SonderaInstallEvent objects.
     * modelChoice: one of the SONDERA_MODEL_PRESETS ids, or null to skip LLM.
     */
    install: t.procedure
      .input(z.object({ modelChoice: z.string().nullable() }))
      .subscription(({ input }) => {
        return observable<SonderaInstallEvent>((emit) => {
          const run = async () => {
            const send = (event: SonderaInstallEvent) => emit.next(event);

            try {
              // ── Copy bundled binaries + policies ──────────────────────────
              send({ step: "extract", status: "running", message: "Installing sondera binaries…", progress: 0.1 });
              await installSonderaBinaries((progress) => {
                if (progress.phase === "copy") {
                  send({ step: "extract", status: "running", message: progress.message ?? "Installing…", progress: 0.3 });
                } else if (progress.phase === "policies") {
                  send({ step: "policies", status: "running", message: "Installing default policies…", progress: 0.5 });
                }
              });
              send({ step: "extract", status: "done", message: "Binaries installed.", progress: 0.5 });
              send({ step: "policies", status: "done", message: "Policies installed.", progress: 0.55 });

              // ── Ollama model setup ────────────────────────────────────────
              if (input.modelChoice) {
                const preset = SONDERA_MODEL_PRESETS.find((p) => p.id === input.modelChoice);
                const ollamaModel = preset?.ollamaModel ?? input.modelChoice;
                const needsAlias = preset ? preset.needsAlias : input.modelChoice !== "full";

                // Check Ollama is installed
                send({ step: "ollama_check", status: "running", message: "Checking Ollama…", progress: 0.6 });
                const ollama = await checkOllamaInstalled();
                if (!ollama.installed) {
                  send({
                    step: "ollama_check",
                    status: "error",
                    message: "Ollama not found in PATH.",
                    errorDetail: "Install Ollama from https://ollama.com/download, then retry.",
                    fixInstructions:
                      "1. Open https://ollama.com/download in your browser\n2. Install the macOS package\n3. Click Retry here",
                    progress: 0.6,
                  });
                  return;
                }
                send({ step: "ollama_check", status: "done", message: "Ollama found.", progress: 0.65 });

                // Pull the chosen base model
                send({ step: "ollama_pull", status: "running", message: `Pulling ${ollamaModel}…`, progress: 0.7 });
                await pullOllamaModel(ollamaModel, (line) => {
                  send({ step: "ollama_pull", status: "running", message: line, progress: 0.7 });
                });
                send({ step: "ollama_pull", status: "done", message: `${ollamaModel} ready.`, progress: 0.85 });

                // Alias to gpt-oss-safeguard:20b if needed
                if (needsAlias) {
                  send({
                    step: "ollama_alias",
                    status: "running",
                    message: `Aliasing ${ollamaModel} → ${SONDERA_HARNESS_MODEL_ALIAS}…`,
                    progress: 0.88,
                  });
                  await createOllamaAlias(ollamaModel, (line) => {
                    send({ step: "ollama_alias", status: "running", message: line, progress: 0.88 });
                  });
                  send({
                    step: "ollama_alias",
                    status: "done",
                    message: `Alias created: ${SONDERA_HARNESS_MODEL_ALIAS}`,
                    progress: 0.92,
                  });
                }
              }

              // Hooks are now installed per-session at project level (not globally).
              // The "hooks" step here just confirms the binary is ready.
              send({ step: "hooks", status: "running", message: "Verifying sondera-claude hook binary…", progress: 0.94 });
              const { existsSync } = await import("node:fs");
              const { default: pathMod } = await import("node:path");
              const { default: osMod } = await import("node:os");
              const claudeBin = pathMod.join(osMod.homedir(), ".supermuschel", "bin", "sondera-claude");
              if (!existsSync(claudeBin)) {
                throw new Error(`sondera-claude binary missing at ${claudeBin}`);
              }
              send({ step: "hooks", status: "done", message: "Hook binary ready. Hooks will be installed per-project when a session starts.", progress: 0.98 });

              // ── Persist install record ─────────────────────────────────────
              const version = await getSonderaVersion(getHarnessBin());
              sqlite
                .prepare(
                  "INSERT INTO sondera_install (completed_at, version, ollama_enabled, model) VALUES (?, ?, ?, ?)",
                )
                .run(Date.now(), version, input.modelChoice ? 1 : 0, input.modelChoice);

              send({ step: "done", status: "done", message: "Policy sandbox ready.", progress: 1 });
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              send({
                step: "error",
                status: "error",
                message: "Installation failed.",
                errorDetail: message,
                fixInstructions: buildFixInstructions(message),
              });
            }
          };

          run();
          return () => {};
        });
      }),

    uninstall: t.procedure.mutation(async () => {
      // Hooks are project-level; they are removed per-session by agent.ts.
      // Nothing global to clean up here.
      await sonderaHarness.stop();
      sqlite.prepare("DELETE FROM sondera_install").run();
      return { ok: true };
    }),
  }),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function pullOllamaModel(model: string, onLine: (line: string) => void): Promise<void> {
  const { spawn } = await import("node:child_process");
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ollama", ["pull", model], { stdio: ["ignore", "pipe", "pipe"] });
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
      else reject(new Error(`ollama pull exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

async function getSonderaVersion(harnessBin: string): Promise<string> {
  if (!existsSync(harnessBin)) return "unknown";
  try {
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    const { stdout } = await exec(harnessBin, ["--version"]).catch(() => ({ stdout: "unknown" }));
    return stdout.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

function buildFixInstructions(errorMessage: string): string {
  if (errorMessage.includes("Bundled binary not found")) {
    return (
      "The sondera binaries are missing from the app bundle.\n\n" +
      "Run once from the supermuschel repo:\n" +
      "  cd apps/desktop && bun run build:sondera\n\n" +
      "Then restart the app and try again."
    );
  }
  if (errorMessage.includes("HTTP 404") || errorMessage.includes("GitHub releases")) {
    return (
      "Network error reaching GitHub releases.\n\n" +
      "Options:\n" +
      "1. Check your internet connection and click Retry\n" +
      "2. Download manually from https://github.com/sondera-ai/sondera-coding-agent-hooks/releases\n" +
      "   and place the binaries in ~/.supermuschel/bin/"
    );
  }
  if (errorMessage.includes("SHA-256") || errorMessage.includes("checksum")) {
    return (
      "Binary integrity check failed — the download may be corrupt.\n\n" +
      "Click Retry to re-download. If this persists, file an issue at\n" +
      "https://github.com/sondera-ai/sondera-coding-agent-hooks/issues"
    );
  }
  if (errorMessage.includes("settings.json") || errorMessage.includes("hook")) {
    return (
      "Could not write to ~/.claude/settings.json.\n\n" +
      "Fix permissions and retry:\n" +
      "  chmod 644 ~/.claude/settings.json\n" +
      "  mkdir -p ~/.claude && touch ~/.claude/settings.json"
    );
  }
  if (errorMessage.includes("socket") || errorMessage.includes("harness server")) {
    return (
      "The harness server failed to start. Full log:\n" +
      "  ~/.supermuschel/logs/sondera-harness.log\n\n" +
      "If the error persists, file an issue at\n" +
      "https://github.com/sondera-ai/sondera-coding-agent-hooks/issues"
    );
  }
  return "Review the error details above and try again. If the problem persists, check disk space and file permissions.";
}
