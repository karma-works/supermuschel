import { atom } from "jotai";
import type { SandboxLevel } from "@supermuschel/shared";

export const selectedWorkspaceIdAtom = atom<string | null>(null);

export type AgentSessionStatus = "starting" | "running" | "stopped" | "crashed";

export interface AgentSession {
  agentId: string;
  status: AgentSessionStatus;
  startedAt: number;
  /** Sandbox level this specific terminal session was started with. */
  sandboxLevel: SandboxLevel;
}

export interface WorkspaceSessionState {
  sessions: AgentSession[];
  activeAgentId: string | null;
}

export const workspaceSessionsAtom = atom<Record<string, WorkspaceSessionState>>({});
