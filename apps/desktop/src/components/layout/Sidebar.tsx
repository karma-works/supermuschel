import { trpc } from "../../lib/trpc.js";
import { WorkspaceSidebarEntry } from "../workspace/WorkspaceSidebarEntry.js";
import { NewWorkspaceButton } from "../workspace/NewWorkspaceButton.js";

export function Sidebar() {
  const { data: workspaces = [] } = trpc.workspace.list.useQuery();

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

      {/* New workspace button — interactive, must opt out of drag */}
      {/* @ts-ignore */}
      <div style={{ padding: "8px 12px 16px", borderTop: "1px solid var(--border)", WebkitAppRegion: "no-drag" }}>
        <NewWorkspaceButton />
      </div>
    </aside>
  );
}
