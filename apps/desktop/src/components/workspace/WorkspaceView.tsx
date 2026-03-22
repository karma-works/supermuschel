import { useEffect, useState } from "react";
import { useAtom } from "jotai";
import type { SandboxLevel } from "@supermuschel/shared";
import { trpc } from "../../lib/trpc.js";
import { TerminalPane } from "../terminal/TerminalPane.js";
import { SandboxSelector } from "../sandbox/SandboxSelector.js";
import { SandboxBadge } from "../sandbox/SandboxBadge.js";
import { NewWorkspaceModal } from "./NewWorkspaceModal.js";
import {
  selectedWorkspaceIdAtom,
  workspaceSessionsAtom,
  type AgentSession,
  type WorkspaceSessionState,
} from "../../stores/atoms.js";
import type { SerializedWorkspace } from "../../lib/types.js";

// ─── Sandbox level display helpers ────────────────────────────────────────────

const SANDBOX_SHORT: Record<number, { label: string; color: string }> = {
  0: { label: "None", color: "var(--sandbox-none)" },
  1: { label: "OS", color: "var(--sandbox-os)" },
  2: { label: "Ctr", color: "var(--sandbox-container)" },
};

// ─── Top-level: workspace selection ───────────────────────────────────────────

export function WorkspaceView() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useAtom(selectedWorkspaceIdAtom);
  const { data: workspaces = [] } = trpc.workspace.list.useQuery();
  const [showNew, setShowNew] = useState(false);

  // Auto-select first workspace when workspaces load and nothing is selected
  useEffect(() => {
    if (!selectedWorkspaceId && workspaces.length > 0) {
      setSelectedWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, selectedWorkspaceId, setSelectedWorkspaceId]);

  const workspace = workspaces.find((w) => w.id === selectedWorkspaceId) ?? null;

  if (!workspace) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48, opacity: 0.2 }}>🐚</div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>
          Welcome to Supermuschel
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 320, textAlign: "center" }}>
          Open a project directory to start an AI agent session with sandboxing.
        </p>
        <button
          onClick={() => setShowNew(true)}
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "none",
            background: "var(--accent)",
            color: "white",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Open Project
        </button>
        {showNew && (
          <NewWorkspaceModal
            onClose={() => setShowNew(false)}
            onCreated={(id) => setSelectedWorkspaceId(id)}
          />
        )}
      </div>
    );
  }

  return <WorkspaceSessionView workspace={workspace} />;
}

// ─── Session view: tabs + terminals ───────────────────────────────────────────

function WorkspaceSessionView({ workspace }: { workspace: SerializedWorkspace }) {
  const [allSessions, setAllSessions] = useAtom(workspaceSessionsAtom);
  const [showSandboxSettings, setShowSandboxSettings] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Sandbox level for the NEXT session to be started. Persists in local state;
  // initialized from the workspace's stored default.
  const [pendingSandboxLevel, setPendingSandboxLevel] = useState<SandboxLevel>(
    () => (workspace.sandboxLevel ?? 1) as SandboxLevel,
  );

  const wsId = workspace.id;
  const wsState: WorkspaceSessionState = allSessions[wsId] ?? { sessions: [], activeAgentId: null };
  const { sessions, activeAgentId } = wsState;

  function patchState(patch: Partial<WorkspaceSessionState>) {
    setAllSessions((prev) => ({
      ...prev,
      [wsId]: { ...(prev[wsId] ?? { sessions: [], activeAgentId: null }), ...patch },
    }));
  }

  function patchSession(agentId: string, patch: Partial<AgentSession>) {
    setAllSessions((prev) => {
      const state = prev[wsId] ?? { sessions: [], activeAgentId: null };
      return {
        ...prev,
        [wsId]: {
          ...state,
          sessions: state.sessions.map((s) => (s.agentId === agentId ? { ...s, ...patch } : s)),
        },
      };
    });
  }

  function addSession(agentId: string, sandboxLevel: SandboxLevel) {
    setAllSessions((prev) => {
      const state = prev[wsId] ?? { sessions: [], activeAgentId: null };
      const newSession: AgentSession = {
        agentId,
        status: "starting",
        startedAt: Date.now(),
        sandboxLevel,
      };
      return {
        ...prev,
        [wsId]: {
          sessions: [...state.sessions, newSession],
          activeAgentId: agentId,
        },
      };
    });
  }

  function removeSession(agentId: string) {
    setAllSessions((prev) => {
      const state = prev[wsId] ?? { sessions: [], activeAgentId: null };
      const remaining = state.sessions.filter((s) => s.agentId !== agentId);
      const newActive =
        state.activeAgentId === agentId
          ? (remaining.at(-1)?.agentId ?? null)
          : state.activeAgentId;
      return { ...prev, [wsId]: { sessions: remaining, activeAgentId: newActive } };
    });
  }

  // Subscribe to agent status events for this workspace
  trpc.agent.status.useSubscription(
    { workspaceId: wsId },
    {
      onData: ({ agentId, status }) => {
        patchSession(agentId, { status: status as AgentSession["status"] });
      },
    },
  );

  const utils = trpc.useUtils();
  const { data: sandboxRequirements } = trpc.sandbox.getRequirements.useQuery(
    { projectPath: workspace.projectPath },
    { enabled: !!workspace },
  );

  function handleSandboxSettingsClose() {
    setShowSandboxSettings(false);
    void utils.sandbox.getRequirements.invalidate({ projectPath: workspace.projectPath });
  }

  const pendingSandboxDiag = sandboxRequirements?.find((r) => r.level === pendingSandboxLevel);
  const sandboxUnavailable = pendingSandboxDiag?.available === false;

  const startMutation = trpc.agent.start.useMutation();

  function handleStart() {
    const level = pendingSandboxLevel;
    setStartError(null);
    startMutation.mutate(
      {
        workspaceId: wsId,
        type: workspace.agentType,
        cwd: workspace.projectPath,
        sandboxLevel: level,
      },
      {
        onSuccess: (data) => addSession(data.agentId, level),
        onError: (err) => setStartError(err.message),
      },
    );
  }

  const stopMutation = trpc.agent.stop.useMutation();

  function handleCloseTab(agentId: string) {
    const session = sessions.find((s) => s.agentId === agentId);
    if (session?.status === "running" || session?.status === "starting") {
      stopMutation.mutate({ agentId });
    }
    removeSession(agentId);
  }

  const canStart = !startMutation.isPending && !sandboxUnavailable;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Session tab bar */}
      {sessions.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-sidebar)",
            height: 36,
            flexShrink: 0,
            overflowX: "auto",
          }}
        >
          {sessions.map((session, i) => {
            const isTab = session.agentId === activeAgentId;
            const statusColor =
              session.status === "running"
                ? "var(--sandbox-os)"
                : session.status === "starting"
                  ? "#f6ad55"
                  : session.status === "crashed"
                    ? "#ef4444"
                    : "var(--text-muted)";
            const sb = SANDBOX_SHORT[session.sandboxLevel] ?? SANDBOX_SHORT[0];

            return (
              <div
                key={session.agentId}
                onClick={() => patchState({ activeAgentId: session.agentId })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "0 10px",
                  cursor: "pointer",
                  borderRight: "1px solid var(--border)",
                  borderBottom: isTab ? "2px solid var(--accent)" : "2px solid transparent",
                  background: isTab ? "var(--bg-base)" : "transparent",
                  color: isTab ? "var(--text-primary)" : "var(--text-muted)",
                  fontSize: 12,
                  fontWeight: isTab ? 500 : 400,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "background 0.1s",
                  minWidth: 120,
                  userSelect: "none",
                }}
                onMouseEnter={(e) => {
                  if (!isTab) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!isTab) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
              >
                {/* Status dot */}
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: statusColor,
                    flexShrink: 0,
                  }}
                />
                <span>Session {i + 1}</span>
                {/* Sandbox level indicator */}
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: sb.color,
                    letterSpacing: "0.02em",
                    opacity: 0.85,
                    flexShrink: 0,
                  }}
                >
                  {sb.label}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCloseTab(session.agentId);
                  }}
                  title={session.status === "running" ? "Stop and close" : "Close"}
                  style={{
                    marginLeft: 1,
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    border: "none",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    lineHeight: 1,
                    padding: 0,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.15)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}

          {/* New session button */}
          <button
            onClick={canStart ? handleStart : undefined}
            disabled={!canStart}
            title="New session"
            style={{
              padding: "0 12px",
              border: "none",
              background: "transparent",
              color: canStart ? "var(--text-muted)" : "var(--border)",
              cursor: canStart ? "pointer" : "not-allowed",
              fontSize: 18,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              if (canStart) (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              if (canStart) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
            }}
          >
            +
          </button>
        </div>
      )}

      {/* Terminal area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {sessions.length === 0 ? (
          /* Empty state — no sessions yet */
          <div
            style={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {sandboxUnavailable && pendingSandboxDiag && (
              <div
                style={{
                  maxWidth: 360,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  textAlign: "left",
                }}
              >
                <p style={{ fontSize: 12, color: "#fca5a5", fontWeight: 600, marginBottom: 4 }}>
                  ✕ Sandbox unavailable: {pendingSandboxDiag.name}
                </p>
                <p style={{ fontSize: 11, color: "#fca5a5", lineHeight: 1.5, marginBottom: 8 }}>
                  {pendingSandboxDiag.reason}
                </p>
                <button
                  onClick={() => setShowSandboxSettings(true)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 5,
                    border: "1px solid rgba(239,68,68,0.4)",
                    background: "transparent",
                    color: "#fca5a5",
                    cursor: "pointer",
                    fontSize: 11,
                  }}
                >
                  ⚙ Open Sandbox Settings
                </button>
              </div>
            )}

            {startError && (
              <p style={{ color: "#ef4444", fontSize: 12, maxWidth: 360, textAlign: "center" }}>
                {startError}
              </p>
            )}

            <button
              onClick={handleStart}
              disabled={!canStart}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: sandboxUnavailable ? "var(--text-muted)" : "var(--accent)",
                color: "white",
                cursor: sandboxUnavailable ? "not-allowed" : "pointer",
                fontSize: 13,
              }}
            >
              {startMutation.isPending ? "Starting…" : "Start Agent"}
            </button>
          </div>
        ) : (
          /* Terminal panes — all mounted, CSS visibility to preserve scrollback */
          sessions.map((session) => {
            const isActiveTab = session.agentId === activeAgentId;
            return (
              <div
                key={session.agentId}
                style={{
                  position: "absolute",
                  inset: 0,
                  visibility: isActiveTab ? "visible" : "hidden",
                }}
              >
                <TerminalPane agentId={session.agentId} isActive={isActiveTab} />
              </div>
            );
          })
        )}
      </div>

      {/* Status bar */}
      <div
        style={{
          height: 32,
          borderTop: "1px solid var(--border)",
          background: "var(--bg-sidebar)",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 10,
          fontSize: 12,
          color: "var(--text-muted)",
          flexShrink: 0,
        }}
      >
        {/* Next session sandbox selector */}
        <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.6 }}>Next:</span>
        <SandboxBadge level={pendingSandboxLevel} />
        <span style={{ opacity: 0.5 }}>|</span>
        <span
          style={{
            color: "var(--accent)",
            textTransform: "uppercase",
            fontSize: 10,
            letterSpacing: "0.04em",
          }}
        >
          {workspace.agentType}
        </span>
        <span style={{ opacity: 0.5 }}>|</span>
        <span
          style={{
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 11,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {workspace.projectPath}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowSandboxSettings(true)}
          style={{
            padding: "3px 8px",
            borderRadius: 4,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          ⚙ Sandbox
        </button>
      </div>

      {showSandboxSettings && (
        <SandboxSelector
          currentLevel={pendingSandboxLevel}
          projectPath={workspace.projectPath}
          onSelect={setPendingSandboxLevel}
          onClose={handleSandboxSettingsClose}
        />
      )}
    </div>
  );
}
