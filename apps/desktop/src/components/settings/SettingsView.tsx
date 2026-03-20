import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { trpc } from "../../lib/trpc.js";
import type { AgentType } from "@supermuschel/shared";

const COMMAND_LABELS: Record<string, { runtime: string; agent: string }> = {
  cmd_yolobox_claude:   { runtime: "yolobox",  agent: "Claude Code" },
  cmd_yolobox_opencode: { runtime: "yolobox",  agent: "OpenCode" },
  cmd_podman_claude:    { runtime: "Podman",    agent: "Claude Code" },
  cmd_podman_opencode:  { runtime: "Podman",    agent: "OpenCode" },
  cmd_docker_claude:    { runtime: "Docker",    agent: "Claude Code" },
  cmd_docker_opencode:  { runtime: "Docker",    agent: "OpenCode" },
};

function CommandRow({ cmdKey, value, defaultValue }: { cmdKey: string; value: string; defaultValue: string }) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);
  const utils = trpc.useUtils();
  const setCmd = trpc.settings.setCommand.useMutation({ onSuccess: () => { utils.settings.getCommands.invalidate(); setSaved(true); setTimeout(() => setSaved(false), 1500); } });
  const resetCmd = trpc.settings.resetCommand.useMutation({ onSuccess: () => { utils.settings.getCommands.invalidate(); setDraft(defaultValue); } });
  const label = COMMAND_LABELS[cmdKey];
  const isDirty = draft !== value;
  const isDefault = value === defaultValue;

  return (
    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label?.runtime ?? cmdKey}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>·</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{label?.agent}</span>
        {!isDefault && (
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 3, background: "rgba(99,102,241,0.15)", color: "var(--accent)" }}>
            customised
          </span>
        )}
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        spellCheck={false}
        rows={draft.length > 80 ? 3 : 1}
        style={{
          width: "100%",
          background: "var(--bg-base)",
          border: "1px solid var(--border)",
          borderRadius: 5,
          color: "var(--text-primary)",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 11,
          padding: "6px 8px",
          resize: "vertical",
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button
          onClick={() => setCmd.mutate({ key: cmdKey, value: draft })}
          disabled={!isDirty || setCmd.isPending}
          style={{
            padding: "3px 10px",
            borderRadius: 4,
            border: "none",
            background: isDirty ? "var(--accent)" : "var(--bg-hover)",
            color: isDirty ? "#fff" : "var(--text-muted)",
            cursor: isDirty ? "pointer" : "default",
            fontSize: 11,
          }}
        >
          {saved ? "Saved ✓" : "Save"}
        </button>
        {!isDefault && (
          <button
            onClick={() => resetCmd.mutate({ key: cmdKey })}
            style={{
              padding: "3px 10px",
              borderRadius: 4,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            Reset to default
          </button>
        )}
      </div>
    </div>
  );
}

export function SettingsView() {
  const claudeDetect = trpc.agent.detect.useQuery({ type: "claude" });
  const opencodeDetect = trpc.agent.detect.useQuery({ type: "opencode" });
  const { data: commands } = trpc.settings.getCommands.useQuery();

  // Defaults mirrored from the main process — used for "Reset to default" label
  const DEFAULTS: Record<string, string> = {
    cmd_yolobox_claude: "yolobox claude",
    cmd_yolobox_opencode:
      "yolobox opencode" +
      " --copy-agent-instructions" +
      " --mount ~/.config/opencode/opencode-yolo.json:/home/yolo/.config/opencode/opencode.json:ro" +
      " --mount ~/.local/share/opencode/auth.json:/home/yolo/.local/share/opencode/auth.json:ro" +
      " --mount ~/.config/opencode/plugins:/home/yolo/.config/opencode/plugins:ro" +
      " --mount ~/.config/opencode/skills:/home/yolo/.config/opencode/skills:ro" +
      " --mount ~/.claude/tasks:/home/yolo/.claude/tasks" +
      " --mount ~/.config/opencode/tasks:/home/yolo/.config/opencode/tasks",
    cmd_podman_claude: "",
    cmd_podman_opencode: "",
    cmd_docker_claude: "",
    cmd_docker_opencode: "",
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32, maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Link
          to="/"
          style={{
            padding: "4px 10px", borderRadius: 5, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-muted)", cursor: "pointer",
            fontSize: 12, textDecoration: "none", display: "inline-block",
          }}
        >
          ← Back
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Settings</h1>
      </div>

      {/* Agent detection */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Agent Detection
        </h2>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {(["claude", "opencode"] as AgentType[]).map((type, i) => {
            const detect = type === "claude" ? claudeDetect : opencodeDetect;
            return (
              <div key={type} style={{ padding: "14px 16px", borderBottom: i === 0 ? "1px solid var(--border)" : "none", display: "flex", alignItems: "center", gap: 10 }}>
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
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: detect.data?.installed ? "var(--sandbox-os)" : "var(--sandbox-none)", flexShrink: 0 }} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Agent commands */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
          Container Agent Commands
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
          Override the command used to launch each agent in container isolation (sandbox level 2).
          Leave empty to use the automatic default. Supports <code style={{ fontFamily: "JetBrains Mono, monospace" }}>~</code> expansion.
        </p>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {commands
            ? Object.keys(DEFAULTS).map((key) => (
                <CommandRow
                  key={key}
                  cmdKey={key}
                  value={commands[key] ?? DEFAULTS[key]}
                  defaultValue={DEFAULTS[key]}
                />
              ))
            : (
              <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
            )}
        </div>
      </section>

      {/* Appearance */}
      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
          Appearance
        </h2>
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px", color: "var(--text-muted)", fontSize: 13 }}>
          Theme follows macOS System Preferences (dark/light adaptive). No override available in Phase 1.
        </div>
      </section>
    </div>
  );
}
