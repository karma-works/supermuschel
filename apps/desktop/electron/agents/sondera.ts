import { spawn, type ChildProcess } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import net from "node:net";
import { mkdir, open } from "node:fs/promises";
import { existsSync } from "node:fs";

const HARNESS_BIN = path.join(homedir(), ".supermuschel", "bin", "sondera-harness-server");
const HARNESS_SOCKET = path.join(homedir(), ".sondera", "sondera-harness.sock");
const POLICIES_DIR = path.join(homedir(), ".supermuschel", "policies");
const LOG_DIR = path.join(homedir(), ".supermuschel", "logs");
const LOG_FILE = path.join(LOG_DIR, "sondera-harness.log");

const STARTUP_TIMEOUT_MS = 8000;

class SonderaHarness {
  private proc: ChildProcess | null = null;
  private startedAt: number | null = null;
  private sessionCount = 0;
  private restarting = false;

  getSocketPath(): string {
    return HARNESS_SOCKET;
  }

  isRunning(): boolean {
    return this.proc !== null && this.proc.exitCode === null;
  }

  getPid(): number | null {
    return this.proc?.pid ?? null;
  }

  getUptimeMs(): number | null {
    return this.startedAt !== null ? Date.now() - this.startedAt : null;
  }

  incrementSession(): void {
    this.sessionCount++;
  }

  decrementSession(): void {
    this.sessionCount = Math.max(0, this.sessionCount - 1);
  }

  async ensureRunning(): Promise<void> {
    if (this.isRunning()) return;
    await this.start();
  }

  private async start(): Promise<void> {
    if (!existsSync(HARNESS_BIN)) {
      throw new Error(
        `Sondera harness binary not found at ${HARNESS_BIN}. ` +
          "Complete the Policy sandbox setup first.",
      );
    }

    await mkdir(LOG_DIR, { recursive: true });
    await mkdir(path.dirname(HARNESS_SOCKET), { recursive: true });

    const logFd = await open(LOG_FILE, "a");

    this.proc = spawn(
      HARNESS_BIN,
      ["--socket", HARNESS_SOCKET, "--policy-path", POLICIES_DIR, "--verbose"],
      {
        detached: false,
        // Keep logFd open until the process exits — closing it here would
        // close the fd while the harness is still writing to it.
        stdio: ["ignore", logFd.fd, logFd.fd],
      },
    );

    this.proc.on("exit", (code) => {
      logFd.close().catch(() => {});
      console.log(`[sondera] harness exited with code ${code} — see ${LOG_FILE}`);
      this.proc = null;
      this.startedAt = null;

      // Auto-restart once if there are active sessions
      if (!this.restarting && this.sessionCount > 0) {
        this.restarting = true;
        setTimeout(() => {
          this.restarting = false;
          this.start().catch((err) => console.error("[sondera] restart failed:", err));
        }, 1000);
      }
    });

    this.startedAt = Date.now();

    // Wait for socket to become reachable
    await this.waitForSocket();
  }

  private waitForSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + STARTUP_TIMEOUT_MS;
      const attempt = () => {
        const sock = net.createConnection(HARNESS_SOCKET);
        sock.on("connect", () => {
          sock.destroy();
          resolve();
        });
        sock.on("error", () => {
          if (Date.now() >= deadline) {
            reject(
              new Error(
                `Sondera harness failed to start within ${STARTUP_TIMEOUT_MS / 1000}s. ` +
                  `Check ${LOG_FILE} for details.`,
              ),
            );
            return;
          }
          setTimeout(attempt, 200);
        });
      };
      setTimeout(attempt, 100);
    });
  }

  async stop(): Promise<void> {
    if (!this.proc) return;
    this.sessionCount = 0;
    this.proc.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => {
        this.proc?.kill("SIGKILL");
        resolve();
      }, 3000);
      this.proc!.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
    this.proc = null;
    this.startedAt = null;
  }
}

export const sonderaHarness = new SonderaHarness();
