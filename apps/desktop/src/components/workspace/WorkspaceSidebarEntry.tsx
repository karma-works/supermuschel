import { useRef, useState } from "react";
import { trpc } from "../../lib/trpc.js";
import type { SerializedWorkspace } from "../../lib/types.js";
import { SandboxBadge } from "../sandbox/SandboxBadge.js";

interface Props {
  workspace: SerializedWorkspace;
}

export function WorkspaceSidebarEntry({ workspace }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [flashing, setFlashing] = useState(false);

  // Subscribe to UI events for this workspace
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
      style={{
        padding: "10px 12px",
        margin: "2px 6px",
        borderRadius: 6,
        cursor: "pointer",
        border: "1px solid transparent",
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = "transparent";
      }}
    >
      {/* Name + agent type */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--sandbox-os)",
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 500, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {workspace.name}
        </span>
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
