import { useState } from "react";
import { trpc } from "../../lib/trpc.js";
import type { AgentType, SandboxLevel } from "@supermuschel/shared";

interface Props {
  onClose: () => void;
}

export function NewWorkspaceModal({ onClose }: Props) {
  const [name, setName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [agentType, setAgentType] = useState<AgentType>("claude");
  const [sandboxLevel, setSandboxLevel] = useState<SandboxLevel>(1);
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const createMutation = trpc.workspace.create.useMutation({
    onSuccess: () => {
      utils.workspace.list.invalidate();
      onClose();
    },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !projectPath.trim()) {
      setError("Name and project path are required");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      projectPath: projectPath.trim(),
      agentType,
      sandboxLevel,
    });
  };

  const SANDBOX_OPTIONS: { level: SandboxLevel; label: string; description: string }[] = [
    { level: 0, label: "None", description: "No restrictions. Agent has full system access." },
    {
      level: 1,
      label: "OS Sandbox (Seatbelt)",
      description: "macOS sandbox-exec. Restricts file access to project dir. Home dir is protected.",
    },
    {
      level: 2,
      label: "Container",
      description: "Docker/Podman container. Strongest isolation. Requires container runtime.",
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 28,
          width: 480,
          maxWidth: "90vw",
        }}
      >
        <h2 style={{ marginBottom: 20, fontSize: 16, fontWeight: 600 }}>New Workspace</h2>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                marginBottom: 12,
                padding: "8px 12px",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 6,
                color: "#ef4444",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Workspace Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "var(--bg-hover)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Project Path
            </span>
            <input
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/Users/you/my-project"
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "var(--bg-hover)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text-primary)",
                fontSize: 13,
                outline: "none",
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
          </label>

          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Agent
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              {(["claude", "opencode"] as AgentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAgentType(type)}
                  style={{
                    flex: 1,
                    padding: "7px 10px",
                    borderRadius: 6,
                    border: `1px solid ${agentType === type ? "var(--accent)" : "var(--border)"}`,
                    background: agentType === type ? "var(--accent-subtle)" : "transparent",
                    color: agentType === type ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: agentType === type ? 500 : 400,
                  }}
                >
                  {type === "claude" ? "Claude Code" : "OpenCode"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Sandbox Level
            </span>
            {SANDBOX_OPTIONS.map((opt) => (
              <div
                key={opt.level}
                onClick={() => setSandboxLevel(opt.level)}
                style={{
                  padding: "10px 12px",
                  marginBottom: 6,
                  borderRadius: 6,
                  border: `1px solid ${sandboxLevel === opt.level ? "var(--accent)" : "var(--border)"}`,
                  background: sandboxLevel === opt.level ? "var(--accent-subtle)" : "transparent",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{opt.description}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{
                padding: "8px 16px",
                borderRadius: 6,
                border: "none",
                background: "var(--accent)",
                color: "white",
                cursor: createMutation.isPending ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 500,
                opacity: createMutation.isPending ? 0.7 : 1,
              }}
            >
              {createMutation.isPending ? "Creating..." : "Start Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
