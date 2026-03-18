import { trpc } from "../../lib/trpc.js";
import type { SandboxLevel } from "@supermuschel/shared";
import type { SerializedWorkspace } from "../../lib/types.js";

interface Props {
  workspace: SerializedWorkspace;
  onClose: () => void;
}

const LEVELS: { level: SandboxLevel; label: string; description: string; icon: string }[] = [
  {
    level: 0,
    label: "None",
    description: "No sandboxing. Agent has full filesystem and network access. Use for trusted projects only.",
    icon: "🔓",
  },
  {
    level: 1,
    label: "OS Sandbox (Seatbelt)",
    description:
      "macOS sandbox-exec. Restricts file access to project directory. Your home directory is protected.",
    icon: "🔒",
  },
  {
    level: 2,
    label: "Container (Podman/Docker)",
    description: "Full container isolation. Strongest protection. Requires Docker or Podman runtime.",
    icon: "📦",
  },
];

export function SandboxSelector({ workspace, onClose }: Props) {
  const utils = trpc.useUtils();
  const updateMutation = trpc.workspace.update.useMutation({
    onSuccess: () => {
      utils.workspace.list.invalidate();
      onClose();
    },
  });

  const { data: availability } = trpc.sandbox.getAllAvailability.useQuery({
    projectPath: workspace.projectPath,
  });

  const handleSelect = (level: SandboxLevel) => {
    updateMutation.mutate({ id: workspace.id, sandboxLevel: level });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
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
          width: 360,
          marginBottom: 40,
        }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Sandbox Settings</h3>

        {LEVELS.map((opt) => {
          const avail = availability?.find((a) => a.level === opt.level);
          const isActive = workspace.sandboxLevel === opt.level;
          const isAvailable = avail?.available ?? true;

          return (
            <div
              key={opt.level}
              onClick={() => isAvailable && handleSelect(opt.level)}
              style={{
                padding: "12px 14px",
                marginBottom: 8,
                borderRadius: 8,
                border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                background: isActive ? "var(--accent-subtle)" : "transparent",
                cursor: isAvailable ? "pointer" : "not-allowed",
                opacity: isAvailable ? 1 : 0.4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>{opt.icon}</span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{opt.label}</span>
                {!isAvailable && (
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: "auto" }}>
                    Not available
                  </span>
                )}
                {isActive && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--accent)",
                      marginLeft: "auto",
                      fontWeight: 600,
                    }}
                  >
                    Active
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                {opt.description}
              </div>
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
