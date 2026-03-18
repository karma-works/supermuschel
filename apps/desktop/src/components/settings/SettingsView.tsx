import { Link } from "@tanstack/react-router";
import { trpc } from "../../lib/trpc.js";
import type { AgentType } from "@supermuschel/shared";

export function SettingsView() {

  const claudeDetect = trpc.agent.detect.useQuery({ type: "claude" });
  const opencodeDetect = trpc.agent.detect.useQuery({ type: "opencode" });

  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        padding: 32,
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Link
          to="/"
          style={{
            padding: "4px 10px",
            borderRadius: 5,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 12,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          ← Back
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Settings</h1>
      </div>

      {/* Agent paths */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Agent Detection
        </h2>
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {(["claude", "opencode"] as AgentType[]).map((type, i) => {
            const detect = type === "claude" ? claudeDetect : opencodeDetect;
            return (
              <div
                key={type}
                style={{
                  padding: "14px 16px",
                  borderBottom: i === 0 ? "1px solid var(--border)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 2 }}>
                    {type === "claude" ? "Claude Code" : "OpenCode"}
                  </div>
                  {detect.data ? (
                    <div style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "var(--text-muted)" }}>
                      {detect.data.path ?? "Not found"}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Detecting…</div>
                  )}
                  {detect.data && !detect.data.installed && detect.data.instructions && (
                    <pre style={{ fontSize: 10, marginTop: 6, color: "#f6ad55", whiteSpace: "pre-wrap", fontFamily: "JetBrains Mono, monospace" }}>
                      {detect.data.instructions}
                    </pre>
                  )}
                </div>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: detect.data?.installed ? "var(--sandbox-os)" : "var(--sandbox-none)",
                    flexShrink: 0,
                  }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Appearance */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Appearance
        </h2>
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "14px 16px",
            color: "var(--text-muted)",
            fontSize: 13,
          }}
        >
          Theme follows macOS System Preferences (dark/light adaptive). No override available in Phase 1.
        </div>
      </section>
    </div>
  );
}
