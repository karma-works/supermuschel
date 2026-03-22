/**
 * Level 3 — Policy backend (Sondera reference monitor).
 *
 * Unlike Seatbelt/Container, this backend does NOT wrap the spawn command.
 * Security is enforced by the sondera-claude hooks that live in
 * ~/.claude/settings.json — they intercept every Claude Code tool call
 * and send it to the harness for policy evaluation.
 *
 * The backend's role is therefore:
 *  1. available() — confirm binaries are installed + harness is reachable
 *  2. wrapSpawn() — identity (no spawn wrapping needed)
 *  3. diagnose()  — rich error with install instructions
 */

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import net from "node:net";
import type { SandboxBackend, SandboxDiagnosis, SpawnConfig } from "./index.js";

const HARNESS_BIN = path.join(homedir(), ".supermuschel", "bin", "sondera-harness-server");
const HARNESS_SOCKET = path.join(homedir(), ".sondera", "sondera-harness.sock");

export class PolicyBackend implements SandboxBackend {
  readonly level = 3 as const;
  readonly name = "Policy";

  async available(): Promise<boolean> {
    const d = await this.diagnose();
    return d.available;
  }

  async diagnose(): Promise<Omit<SandboxDiagnosis, "level" | "name">> {
    if (!existsSync(HARNESS_BIN)) {
      return {
        available: false,
        reason:
          "Sondera is not installed. Click the Policy tier in Sandbox Settings to set it up.",
        fixable: false,
      };
    }

    const reachable = await checkSocketReachable(HARNESS_SOCKET);
    if (!reachable) {
      return {
        available: false,
        reason:
          "Sondera harness is not running. It will be started automatically when you begin a session.",
        fixable: false,
      };
    }

    return { available: true, fixable: false };
  }

  // Policy enforcement is done via Claude Code hooks — no spawn wrapping needed.
  wrapSpawn(config: SpawnConfig): SpawnConfig {
    return config;
  }
}

function checkSocketReachable(socketPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!existsSync(socketPath)) {
      resolve(false);
      return;
    }
    const sock = net.createConnection(socketPath);
    const timer = setTimeout(() => {
      sock.destroy();
      resolve(false);
    }, 1000);
    sock.on("connect", () => {
      clearTimeout(timer);
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}
