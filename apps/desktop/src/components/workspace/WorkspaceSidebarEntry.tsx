import { useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { trpc } from "../../lib/trpc.js";
import type { SerializedWorkspace } from "../../lib/types.js";
import { SandboxBadge } from "../sandbox/SandboxBadge.js";
import { selectedWorkspaceIdAtom, workspaceSessionsAtom } from "../../stores/atoms.js";

interface Props {
  workspace: SerializedWorkspace;
}

export function WorkspaceSidebarEntry({ workspace }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [flashing, setFlashing] = useState(false);

  const selectedWorkspaceId = useAtomValue(selectedWorkspaceIdAtom);
  const setSelectedWorkspaceId = useSetAtom(selectedWorkspaceIdAtom);
  const allSessions = useAtomValue(workspaceSessionsAtom);

  const isActive = selectedWorkspaceId === workspace.id;
  const sessions = allSessions[workspace.id]?.sessions ?? [];
  const runningCount = sessions.filter((s) => s.status === "running" || s.status === "starting").length;

  trpc.agentUi.events.useSubscription(
    { workspaceId: workspace.id },
    {
      onData: (event) => {
        if (event.type === "trigger-flash") {
          setFlashing(true);
          setTimeout(() => setFlashing(false), 700);
        }
      },
    },
  );

  const badges = workspace.statusBadges ?? {};
  const progress = workspace.progress;

  return (
    <div
      ref={ref}
      className={flashing ? "workspace-flash" : ""}
      onClick={() => setSelectedWorkspaceId(workspace.id)}
      style={{
        padding: "10px 12px",
        margin: "2px 6px",
        borderRadius: 6,
        cursor: "pointer",
        border: `1px solid ${isActive ? "var(--accent)" : "transparent"}`,
        background: isActive ? "var(--bg-hover)" : "transparent",
        transition: "background 0.1s, border-color 0.1s",
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent";
      }}
    >
      {/* Name + running indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: runningCount > 0 ? "var(--sandbox-os)" : "var(--text-muted)",
            flexShrink: 0,
            transition: "background 0.2s",
          }}
        />
        <span
          style={{
            fontWeight: isActive ? 600 : 500,
            fontSize: 13,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: isActive ? "var(--text-primary)" : undefined,
            flex: 1,
          }}
        >
          {workspace.name}
        </span>
        {runningCount > 0 && (
          <span
            style={{
              fontSize: 10,
              padding: "1px 5px",
              borderRadius: 10,
              background: "rgba(34,197,94,0.15)",
              color: "var(--sandbox-os)",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {runningCount}
          </span>
        )}
      </div>

      {/* Status badges */}
      {Object.entries(badges).map(([key, badge]) => (
        <div
          key={key}
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            display: "flex",
            gap: 4,
            marginBottom: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ opacity: 0.6 }}>{key}:</span>
          <span>{badge.value}</span>
        </div>
      ))}

      {/* Progress bar */}
      {progress !== null && progress !== undefined && (
        <div
          style={{
            height: 3,
            background: "var(--border)",
            borderRadius: 2,
            marginTop: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(progress * 100)}%`,
              background: "var(--accent)",
              borderRadius: 2,
              transition: "width 0.3s ease",
            }}
          />
        </div>
      )}

      {/* Sandbox + agent badges */}
      <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
        <SandboxBadge level={workspace.sandboxLevel ?? 0} />
        <span
          style={{
            fontSize: 10,
            padding: "1px 5px",
            borderRadius: 3,
            background: "var(--accent-subtle)",
            color: "var(--accent)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {workspace.agentType}
        </span>
      </div>
    </div>
  );
}
