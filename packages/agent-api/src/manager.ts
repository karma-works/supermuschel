import { EventEmitter } from "node:events";
import { execSync } from "node:child_process";
import * as pty from "node-pty";
import chokidar from "chokidar";
import type { FSWatcher } from "chokidar";
import type { SandboxManager } from "@supermuschel/sandbox";
import type { AgentStatus, AgentType, FileEvent, SandboxLevel } from "@supermuschel/shared";

// Matches raw EACCES/EPERM strings that appear in PTY output when bwrap blocks a path.
// Strip ANSI escape codes before matching if needed.
const EPERM_RE = /(?:EACCES|EPERM|permission denied)[^\n]*?'(\/[^']+)'/i;
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]/g;

export interface AgentProcess {
  id: string;
  workspaceId: string;
  type: AgentType;
  cwd: string;
  sandboxLevel: SandboxLevel;
  pid: number;
  status: AgentStatus;
  pty: pty.IPty;
  sandboxManager: SandboxManager;
  watcher: FSWatcher | null;
  /** Rolling buffer of raw PTY output chunks for late-joining subscribers. */
  outputBuffer: string[];
}

export interface StartAgentOptions {
  workspaceId: string;
  type: AgentType;
  cwd: string;
  sandboxLevel: SandboxLevel;
  sandboxManager: SandboxManager;
  supermushelBinPath: string;
  /** If provided, bypasses default spawn logic (sandbox wrap + agent flags). */
  commandOverride?: { cmd: string; args: string[] };
}

export class AgentManager extends EventEmitter {
  private agents: Map<string, AgentProcess> = new Map();

  async detectAgent(type: AgentType): Promise<string | null> {
    const bin = type === "claude" ? "claude" : "opencode";
    try {
      const path = execSync(`which ${bin}`, { encoding: "utf8" }).trim();
      return path || null;
    } catch {
      return null;
    }
  }

  async start(opts: StartAgentOptions): Promise<AgentProcess> {
    const { workspaceId, type, cwd, sandboxLevel, sandboxManager, supermushelBinPath, commandOverride } = opts;

    let spawnCmd: string;
    let spawnArgs: string[];

    if (commandOverride) {
      spawnCmd = commandOverride.cmd;
      spawnArgs = commandOverride.args;
    } else {
      const binPath = await this.detectAgent(type);
      if (!binPath) {
        throw new Error(
          `${type === "claude" ? "Claude Code" : "OpenCode"} is not installed. Install it first.`,
        );
      }
      const agentArgs = sandboxLevel >= 1 ? ["--dangerously-skip-permissions"] : [];
      // Claude Code manages its own Seatbelt sandbox internally on macOS.
      // Wrapping it in another sandbox-exec causes intersecting policies that
      // abort startup silently. Skip the OS-level wrap for claude at Level 1;
      // claude's built-in bash tool sandboxing is still the safety boundary.
      const skipOsWrap = type === "claude" && sandboxLevel === 1;
      const wrapped = skipOsWrap
        ? { cmd: binPath, args: agentArgs, opts: { cwd } }
        : sandboxManager.wrapSpawn(sandboxLevel, { cmd: binPath, args: agentArgs, opts: { cwd } });
      spawnCmd = wrapped.cmd;
      spawnArgs = wrapped.args;
    }

    const env = {
      ...process.env,
      SUPERMUSCHEL_WORKSPACE_ID: workspaceId,
      SUPERMUSCHEL_SOCKET: `/tmp/supermuschel-${workspaceId}.sock`,
      PATH: `${supermushelBinPath}:${process.env.PATH}`,
    };

    const terminal = pty.spawn(spawnCmd, spawnArgs, {
      name: "xterm-256color",
      cols: 220,
      rows: 50,
      cwd,
      env: env as Record<string, string>,
    });

    const id = `${workspaceId}-${Date.now()}`;

    // Start chokidar watcher for write events (only for sandboxed sessions)
    let watcher: FSWatcher | null = null;
    if (sandboxLevel === 1) {
      watcher = chokidar.watch(cwd, {
        ignored: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/.next/**"],
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
      });
      watcher.on("add", (path) => {
        const ev: FileEvent & { agentId: string } = { agentId: id, type: "write", path, ts: Date.now() };
        this.emit("fileEvent", ev);
      });
      watcher.on("change", (path) => {
        const ev: FileEvent & { agentId: string } = { agentId: id, type: "write", path, ts: Date.now() };
        this.emit("fileEvent", ev);
      });
    }

    const agent: AgentProcess = {
      id,
      workspaceId,
      type,
      cwd,
      sandboxLevel,
      pid: terminal.pid,
      status: "starting",
      pty: terminal,
      sandboxManager,
      watcher,
      outputBuffer: [],
    };

    const BUFFER_MAX_CHUNKS = 2000;

    terminal.onData((data) => {
      // Buffer for late-joining subscribers (e.g. web WS connects after PTY starts)
      agent.outputBuffer.push(data);
      if (agent.outputBuffer.length > BUFFER_MAX_CHUNKS) {
        agent.outputBuffer.shift();
      }
      this.emit("data", { agentId: id, workspaceId, data });

      // EPERM parsing: tap PTY data for blocked path events (bwrap Level 1 Linux)
      if (sandboxLevel === 1) {
        const clean = data.replace(ANSI_RE, "");
        const m = EPERM_RE.exec(clean);
        if (m) {
          const ev: FileEvent & { agentId: string } = { agentId: id, type: "blocked", path: m[1], ts: Date.now() };
          this.emit("fileEvent", ev);
        }
      }
    });

    terminal.onExit(({ exitCode }) => {
      if (sandboxLevel === 4) {
        sandboxManager.cleanup(4).catch((err) =>
          console.warn("[agent] failed to cleanup sandbox backend:", err),
        );
      }
      agent.status = exitCode === 0 ? "stopped" : "crashed";
      this.agents.delete(id);
      this.emit("exit", { agentId: id, workspaceId, exitCode });
    });

    agent.status = "running";
    this.agents.set(id, agent);
    this.emit("started", { agentId: id, workspaceId });

    return agent;
  }

  stop(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    agent.watcher?.close().catch(() => {});
    agent.pty.kill();
    agent.status = "stopped";
    this.agents.delete(agentId);
  }

  write(agentId: string, data: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return; // agent stopped — discard keystroke
    agent.pty.write(data);
  }

  resize(agentId: string, cols: number, rows: number): void {
    const agent = this.agents.get(agentId);
    if (!agent) return; // agent stopped — ResizeObserver/xterm teardown race, safe to ignore
    agent.pty.resize(cols, rows);
  }

  getAgent(agentId: string): AgentProcess | undefined {
    return this.agents.get(agentId);
  }

  getAgentsForWorkspace(workspaceId: string): AgentProcess[] {
    return [...this.agents.values()].filter((a) => a.workspaceId === workspaceId);
  }

  onFileEvent(agentId: string, cb: (e: FileEvent) => void): () => void {
    const handler = (e: FileEvent & { agentId: string }) => {
      if (e.agentId === agentId) cb(e);
    };
    this.on("fileEvent", handler);
    return () => this.off("fileEvent", handler);
  }

  stopAll(): void {
    for (const [id] of this.agents) {
      this.stop(id);
    }
  }
}
