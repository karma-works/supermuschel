import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import type { SandboxLevel, SandboxZones, FileEvent } from "@supermuschel/shared";

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

export const sessionZonesAtom = atomFamily((_sessionId: string) =>
  atom<SandboxZones | null>(null)
);

export const sessionFileEventsAtom = atomFamily((_sessionId: string) =>
  atom<FileEvent[]>([])
);

export const sessionEventCountsAtom = atomFamily((_sessionId: string) =>
  atom({ blocked: 0, writes: 0 })
);
