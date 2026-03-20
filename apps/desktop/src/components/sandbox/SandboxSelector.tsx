import { trpc } from "../../lib/trpc.js";
import type { SandboxLevel } from "@supermuschel/shared";
import type { SerializedWorkspace } from "../../lib/types.js";

declare global {
  interface Window {
    shell: { openExternal: (url: string) => Promise<void> };
  }
}

interface Props {
  workspace: SerializedWorkspace;
  onClose: () => void;
}

const LEVELS: {
  level: SandboxLevel;
  label: string;
  description: string;
  yoloNote?: string;
  icon: string;
}[] = [
  {
    level: 0,
    label: "None",
    icon: "🔓",
    description:
      "No sandboxing. The agent has full access to your filesystem and network — same as running it in a terminal yourself. Use this only for projects you fully trust.",
  },
  {
    level: 1,
    label: "OS Sandbox (Seatbelt)",
    icon: "🔒",
    description:
      "Uses macOS sandbox-exec to confine the agent to your project directory. Your home folder, SSH keys, and other personal files are off-limits. Recommended for most projects.",
    yoloNote: "Agent runs with --dangerously-skip-permissions (the sandbox is the safety boundary).",
  },
  {
    level: 2,
    label: "Container",
    icon: "📦",
    description:
      "Runs the agent inside a Docker or Podman container. Strongest isolation — the agent can't see your host filesystem at all. Requires a container runtime to be installed.",
    yoloNote: "Agent runs with --dangerously-skip-permissions inside the container.",
  },
];

const STATUS_COLORS = {
  available: "#22c55e",
  unavailable: "#ef4444",
  loading: "#6b7280",
};

export function SandboxSelector({ workspace, onClose }: Props) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.workspace.update.useMutation({
    onSuccess: () => {
      utils.workspace.list.invalidate();
      onClose();
    },
  });

  const { data: requirements, isLoading } = trpc.sandbox.getRequirements.useQuery({
    projectPath: workspace.projectPath,
  });

  const handleSelect = (level: SandboxLevel, available: boolean) => {
    if (!available) return;
    updateMutation.mutate({ id: workspace.id, sandboxLevel: level });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "flex-end",
        zIndex: 500,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 20,
          width: 400,
          marginBottom: 40,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>
          Sandbox Settings
        </h3>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
          Sandboxing controls what the AI agent is allowed to access on your system. A higher level
          means more protection, but requires more software to be installed.
        </p>

        {LEVELS.map((opt) => {
          const diag = requirements?.find((r) => r.level === opt.level);
          const isActive = workspace.sandboxLevel === opt.level;
          const isAvailable = diag?.available ?? !isLoading;
          const isPending = isLoading && !diag;

          return (
            <div
              key={opt.level}
              onClick={() => handleSelect(opt.level, isAvailable)}
              style={{
                padding: "12px 14px",
                marginBottom: 8,
                borderRadius: 8,
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                background: isActive ? "rgba(99,102,241,0.08)" : "transparent",
                cursor: isAvailable ? "pointer" : "default",
                opacity: isPending ? 0.6 : 1,
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{opt.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                  {opt.label}
                </span>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  {isPending ? (
                    <span style={{ fontSize: 10, color: STATUS_COLORS.loading }}>Checking…</span>
                  ) : isAvailable ? (
                    <span style={{ fontSize: 10, color: STATUS_COLORS.available, fontWeight: 500 }}>
                      ● Available
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: STATUS_COLORS.unavailable, fontWeight: 500 }}>
                      ✕ Not available
                    </span>
                  )}
                  {isActive && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--accent)",
                        fontWeight: 700,
                        background: "rgba(99,102,241,0.15)",
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                {opt.description}
              </p>

              {/* YOLO note */}
              {opt.yoloNote && isAvailable && (
                <p
                  style={{
                    fontSize: 10,
                    color: "#f59e0b",
                    marginTop: 6,
                    marginBottom: 0,
                    lineHeight: 1.4,
                  }}
                >
                  ⚡ {opt.yoloNote}
                </p>
              )}

              {/* Unavailability reason + fix */}
              {!isPending && !isAvailable && diag?.reason && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    background: "rgba(239,68,68,0.08)",
                    borderRadius: 6,
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p
                    style={{
                      fontSize: 11,
                      color: "#fca5a5",
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {diag.reason}
                  </p>
                  {diag.fixable && diag.fixUrl && diag.fixLabel && (
                    <button
                      onClick={() => window.shell.openExternal(diag.fixUrl!)}
                      style={{
                        marginTop: 8,
                        padding: "5px 12px",
                        borderRadius: 5,
                        border: "none",
                        background: "var(--accent)",
                        color: "white",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 500,
                      }}
                    >
                      {diag.fixLabel} ↗
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "7px 14px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
