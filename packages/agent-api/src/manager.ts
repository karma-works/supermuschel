import { EventEmitter } from "node:events";
import { execSync } from "node:child_process";
import * as pty from "node-pty";
import type { SandboxManager } from "@supermuschel/sandbox";
import type { AgentStatus, AgentType, SandboxLevel } from "@supermuschel/shared";

export interface AgentProcess {
  id: string;
  workspaceId: string;
  type: AgentType;
  cwd: string;
  sandboxLevel: SandboxLevel;
  pid: number;
  status: AgentStatus;
  pty: pty.IPty;
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
      const agentArgs = type === "claude" && sandboxLevel >= 1
        ? ["--dangerously-skip-permissions"]
        : [];
      const wrapped = sandboxManager.wrapSpawn(sandboxLevel, {
        cmd: binPath,
        args: agentArgs,
        opts: { cwd },
      });
      spawnCmd = wrapped.cmd;
      spawnArgs = wrapped.args;
    }

    // Inject supermuschel binary into PATH
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
    const agent: AgentProcess = {
      id,
      workspaceId,
      type,
      cwd,
      sandboxLevel,
      pid: terminal.pid,
      status: "starting",
      pty: terminal,
    };

    terminal.onData((data) => {
      this.emit("data", { agentId: id, workspaceId, data });
    });

    terminal.onExit(({ exitCode }) => {
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
    agent.pty.kill();
    agent.status = "stopped";
    this.agents.delete(agentId);
  }

  write(agentId: string, data: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    agent.pty.write(data);
  }

  resize(agentId: string, cols: number, rows: number): void {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    agent.pty.resize(cols, rows);
  }

  getAgent(agentId: string): AgentProcess | undefined {
    return this.agents.get(agentId);
  }

  getAgentsForWorkspace(workspaceId: string): AgentProcess[] {
    return [...this.agents.values()].filter((a) => a.workspaceId === workspaceId);
  }

  stopAll(): void {
    for (const [id] of this.agents) {
      this.stop(id);
    }
  }
}
