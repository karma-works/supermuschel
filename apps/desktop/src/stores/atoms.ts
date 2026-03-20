import { atom } from "jotai";

export const selectedWorkspaceIdAtom = atom<string | null>(null);

export type AgentSessionStatus = "starting" | "running" | "stopped" | "crashed";

export interface AgentSession {
  agentId: string;
  status: AgentSessionStatus;
  startedAt: number;
}

export interface WorkspaceSessionState {
  sessions: AgentSession[];
  activeAgentId: string | null;
}

export const workspaceSessionsAtom = atom<Record<string, WorkspaceSessionState>>({});
