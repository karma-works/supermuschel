import { useState } from "react";
import type { SandboxLevel } from "@supermuschel/shared";
import { trpc } from "../../lib/trpc.js";
import { SonderaWizard } from "./SonderaWizard.js";

declare global {
  interface Window {
    shell: { openExternal: (url: string) => Promise<void> };
  }
}

interface Props {
  currentLevel: SandboxLevel;
  projectPath: string;
  onSelect: (level: SandboxLevel) => void;
  onClose: () => void;
}

const LEVELS: {
  level: SandboxLevel;
  label: string;
  description: string;
  yoloNote?: string;
  icon: string;
  recommended?: boolean;
  color?: string;
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
      "Uses macOS sandbox-exec to confine the agent to your project directory. Your home folder, SSH keys, and other personal files are off-limits.",
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
  {
    level: 3,
    label: "Policy (Sondera)",
    icon: "🛡️",
    description:
      "Cedar policy enforcement + YARA-X signature scanning intercept every agent tool call. Fast and lightweight — works with any agent and any OS. Optional LLM classifier for data-sensitivity tagging.",
    color: "#a855f7",
  },
  {
    level: 4 as SandboxLevel,
    label: "OpenShell",
    icon: "🧊",
    description:
      "NVIDIA's AI agent sandbox — Landlock LSM + per-binary network policies. Runs agents inside a Docker container with fine-grained filesystem and network controls. Requires Docker.",
    yoloNote: "Agent runs with --dangerously-skip-permissions inside the OpenShell sandbox.",
    recommended: true,
    color: "#76b900",
  },
];

const STATUS_COLORS = {
  available: "#22c55e",
  unavailable: "#ef4444",
  loading: "#6b7280",
};

export function SandboxSelector({ currentLevel, projectPath, onSelect, onClose }: Props) {
  const { data: requirements, isLoading } = trpc.sandbox.getRequirements.useQuery({ projectPath });
  const { data: sonderaStatus } = trpc.sandbox.sondera.getStatus.useQuery();
  const [showWizard, setShowWizard] = useState(false);
  const [removeHooksStatus, setRemoveHooksStatus] = useState<"idle" | "done">("idle");
  const removeHooksMutation = trpc.sandbox.sondera.removeProjectHooks.useMutation({
    onSuccess: () => {
      setRemoveHooksStatus("done");
      setTimeout(() => setRemoveHooksStatus("idle"), 3000);
    },
  });

  const handleSelect = (level: SandboxLevel, available: boolean) => {
    // Level 3 (Policy): if not installed, show wizard first
    if (level === 3 && !sonderaStatus?.installed) {
      setShowWizard(true);
      return;
    }
    if (!available && level !== 3) return;
    onSelect(level);
    onClose();
  };

  if (showWizard) {
    return (
      <SonderaWizard
        onComplete={(_modelChoice) => {
          setShowWizard(false);
          onSelect(3);
          onClose();
        }}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

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
          Sandbox for New Sessions
        </h3>
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
          Choose the isolation level for the next terminal session you start. Each session can use a
          different sandbox — existing sessions are not affected.
        </p>

        {LEVELS.map((opt) => {
          const diag = requirements?.find((r) => r.level === opt.level);
          // Level 3 (Policy): available if installed+harness running, OR not yet installed (clickable to setup)
          const isPolicyLevel = opt.level === 3;
          const policyInstalled = sonderaStatus?.installed ?? false;
          const isActive = currentLevel === opt.level;
          const isAvailable = isPolicyLevel
            ? true // always clickable — wizard handles not-installed case
            : (diag?.available ?? !isLoading);
          const isPending = isLoading && !diag && !isPolicyLevel;
          const accentColor = opt.color ?? "var(--accent)";

          return (
            <div
              key={opt.level}
              onClick={() => handleSelect(opt.level, isAvailable)}
              style={{
                padding: "12px 14px",
                marginBottom: 8,
                borderRadius: 8,
                border: `1px solid ${isActive ? accentColor : "var(--border)"}`,
                background: isActive ? `${accentColor}14` : "transparent",
                cursor: "pointer",
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
                {opt.recommended && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: accentColor,
                      background: `${accentColor}20`,
                      padding: "1px 5px",
                      borderRadius: 3,
                      letterSpacing: "0.05em",
                    }}
                  >
                    ★ RECOMMENDED
                  </span>
                )}
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  {isPending ? (
                    <span style={{ fontSize: 10, color: STATUS_COLORS.loading }}>Checking…</span>
                  ) : isPolicyLevel && !policyInstalled ? (
                    <span style={{ fontSize: 10, color: accentColor, fontWeight: 500 }}>
                      ○ Setup required
                    </span>
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
                        color: accentColor,
                        fontWeight: 700,
                        background: `${accentColor}25`,
                        padding: "1px 6px",
                        borderRadius: 4,
                      }}
                    >
                      Selected
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

              {/* Level 3: remove hooks action (shown when installed) */}
              {opt.level === 3 && policyInstalled && (
                <div
                  style={{ marginTop: 8 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {removeHooksStatus === "done" ? (
                    <span style={{ fontSize: 10, color: "#22c55e" }}>✓ Hooks removed from project</span>
                  ) : (
                    <button
                      onClick={() => removeHooksMutation.mutate({ projectPath })}
                      disabled={removeHooksMutation.isPending}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 4,
                        border: "1px solid rgba(239,68,68,0.35)",
                        background: "transparent",
                        color: removeHooksMutation.isPending ? "var(--text-muted)" : "#fca5a5",
                        cursor: removeHooksMutation.isPending ? "not-allowed" : "pointer",
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                    >
                      {removeHooksMutation.isPending ? "Removing…" : "Remove hooks from this project"}
                    </button>
                  )}
                </div>
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
