import { useNavigate, useLocation } from "@tanstack/react-router";
import { trpc } from "../../lib/trpc.js";
import { WorkspaceSidebarEntry } from "../workspace/WorkspaceSidebarEntry.js";
import { NewWorkspaceButton } from "../workspace/NewWorkspaceButton.js";

export function Sidebar() {
  const { data: workspaces = [] } = trpc.workspace.list.useQuery();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside
      style={{
        width: 220,
        minWidth: 220,
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        paddingTop: 38,
        height: "100vh",
        overflow: "hidden",
        // @ts-ignore electron-specific
        WebkitAppRegion: "drag",
      }}
    >
      {/* App name */}
      <div
        style={{
          padding: "12px 16px 8px",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-muted)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        Workspaces
      </div>

      {/* Workspace list — interactive, must opt out of drag */}
      {/* @ts-ignore */}
      <div style={{ flex: 1, overflowY: "auto", WebkitAppRegion: "no-drag" }}>
        {workspaces.map((ws) => (
          <WorkspaceSidebarEntry key={ws.id} workspace={ws} />
        ))}

        {workspaces.length === 0 && (
          <div
            style={{
              padding: "24px 16px",
              color: "var(--text-muted)",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            No workspaces yet.
            <br />
            Open a project to get started.
          </div>
        )}
      </div>

      {/* Bottom bar: new workspace + settings — interactive, must opt out of drag */}
      {/* @ts-ignore */}
      <div
        style={{
          padding: "8px 12px 16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 8,
          alignItems: "center",
          // @ts-ignore electron-specific
          WebkitAppRegion: "no-drag",
        }}
      >
        <div style={{ flex: 1 }}>
          <NewWorkspaceButton />
        </div>
        <button
          onClick={() => navigate({ to: location.pathname === "/settings" ? "/" : "/settings" })}
          title="Settings (⌘,)"
          style={{
            width: 32,
            height: 32,
            borderRadius: 7,
            border: `1px solid ${location.pathname === "/settings" ? "var(--accent)" : "var(--border)"}`,
            background: location.pathname === "/settings" ? "var(--accent-subtle)" : "transparent",
            color: location.pathname === "/settings" ? "var(--accent)" : "var(--text-muted)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          ⚙
        </button>
      </div>
    </aside>
  );
}
