import { useState } from "react";
import { trpc } from "../../lib/trpc.js";
import { TerminalPane } from "../terminal/TerminalPane.js";
import { SandboxSelector } from "../sandbox/SandboxSelector.js";
import { SandboxBadge } from "../sandbox/SandboxBadge.js";
import { NewWorkspaceModal } from "./NewWorkspaceModal.js";

export function WorkspaceView() {
  const { data: workspaces = [] } = trpc.workspace.list.useQuery();
  const [showNew, setShowNew] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [showSandboxSettings, setShowSandboxSettings] = useState(false);

  const activeWorkspace = workspaces[0] ?? null;

  const startMutation = trpc.agent.start.useMutation({
    onSuccess: (data) => setActiveAgentId(data.agentId),
  });

  const stopMutation = trpc.agent.stop.useMutation({
    onSuccess: () => setActiveAgentId(null),
  });

  if (!activeWorkspace) {
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
        {showNew && <NewWorkspaceModal onClose={() => setShowNew(false)} />}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Terminal area */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeAgentId ? (
          <TerminalPane agentId={activeAgentId} />
        ) : (
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
            <p style={{ color: "var(--text-muted)" }}>Agent not running</p>
            <button
              onClick={() =>
                startMutation.mutate({
                  workspaceId: activeWorkspace.id,
                  type: activeWorkspace.agentType,
                  cwd: activeWorkspace.projectPath,
                  sandboxLevel: (activeWorkspace.sandboxLevel ?? 1) as 0 | 1 | 2,
                })
              }
              disabled={startMutation.isPending}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: "var(--accent)",
                color: "white",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {startMutation.isPending ? "Starting..." : "Start Agent"}
            </button>
          </div>
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
        <SandboxBadge level={activeWorkspace.sandboxLevel ?? 0} />
        <span style={{ opacity: 0.5 }}>|</span>
        <span style={{ color: "var(--accent)", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.04em" }}>
          {activeWorkspace.agentType}
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
          {activeWorkspace.projectPath}
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
        {activeAgentId && (
          <button
            onClick={() => stopMutation.mutate({ agentId: activeAgentId })}
            style={{
              padding: "3px 8px",
              borderRadius: 4,
              border: "1px solid rgba(239,68,68,0.3)",
              background: "transparent",
              color: "#ef4444",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            Stop
          </button>
        )}
      </div>

      {showSandboxSettings && activeWorkspace && (
        <SandboxSelector
          workspace={activeWorkspace}
          onClose={() => setShowSandboxSettings(false)}
        />
      )}
    </div>
  );
}
