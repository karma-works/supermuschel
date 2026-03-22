import { useState } from "react";
import { SONDERA_MODEL_PRESETS } from "@supermuschel/shared";
import type { SonderaInstallEvent } from "@supermuschel/shared";
import { trpc } from "../../lib/trpc.js";

interface Props {
  onComplete: (modelChoice: string | null) => void;
  onCancel: () => void;
}

type Step = "model" | "installing" | "done" | "error";

export function SonderaWizard({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState<Step>("model");
  const [modelChoice, setModelChoice] = useState<string | null>("phi4-mini");
  const [events, setEvents] = useState<SonderaInstallEvent[]>([]);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [fixInstructions, setFixInstructions] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Subscribe to install events when installing
  trpc.sandbox.sondera.install.useSubscription(
    { modelChoice: step === "installing" ? modelChoice : null },
    {
      enabled: step === "installing",
      onData(event) {
        setEvents((prev) => {
          const updated = [...prev];
          const existing = updated.findIndex((e) => e.step === event.step);
          if (existing >= 0) updated[existing] = event;
          else updated.push(event);
          return updated;
        });
        if (event.step === "done" && event.status === "done") {
          utils.sandbox.sondera.getStatus.invalidate();
          setStep("done");
        } else if (event.status === "error") {
          setErrorDetail(event.errorDetail ?? event.message);
          setFixInstructions(event.fixInstructions ?? null);
          setStep("error");
        }
      },
    },
  );

  const STEP_LABELS: Record<string, string> = {
    extract: "Installing binaries",
    policies: "Installing policies",
    ollama_check: "Checking Ollama",
    ollama_pull: "Pulling model",
    ollama_alias: "Creating alias",
    hooks: "Verifying hooks",
    done: "Done",
    error: "Error",
  };

  if (step === "model") {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            🛡️ Set Up Policy Sandbox
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
            Sondera uses Cedar policies + YARA-X signatures to intercept every agent tool call.
            Hooks are installed per-project into{" "}
            <code style={{ fontFamily: "JetBrains Mono, monospace" }}>.claude/settings.json</code>{" "}
            — your global Claude settings are not modified.
          </p>

          <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            Optional: LLM classifier for data-sensitivity tagging
          </p>

          {/* No LLM option */}
          <div
            style={optionStyle(modelChoice === null)}
            onClick={() => setModelChoice(null)}
          >
            <div style={{ fontWeight: 500, fontSize: 13 }}>No LLM</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Policy + signature enforcement only. Fastest, no extra downloads.
            </div>
          </div>

          {SONDERA_MODEL_PRESETS.map((preset) => (
            <div
              key={preset.id}
              style={optionStyle(modelChoice === preset.id)}
              onClick={() => setModelChoice(preset.id)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{preset.label}</span>
                {"recommended" in preset && preset.recommended && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: "var(--accent)",
                      background: "var(--accent-subtle)",
                      padding: "1px 5px",
                      borderRadius: 3,
                    }}
                  >
                    ★ RECOMMENDED
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
                  ~{preset.sizeGb} GB
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {preset.description}
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <button style={secondaryBtnStyle} onClick={onCancel}>
              Cancel
            </button>
            <button
              style={primaryBtnStyle}
              onClick={() => setStep("installing")}
            >
              Install →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "installing") {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            Installing Sondera…
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(STEP_LABELS).map(([key, label]) => {
              if (key === "error") return null;
              const event = events.find((e) => e.step === key);
              const status = event?.status ?? "pending";
              const icon =
                status === "done" ? "✓" : status === "running" ? "⟳" : "○";
              const color =
                status === "done"
                  ? "#22c55e"
                  : status === "running"
                    ? "var(--accent)"
                    : "var(--text-muted)";
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color, fontSize: 13, width: 16 }}>{icon}</span>
                  <span style={{ fontSize: 13, color }}>
                    {label}
                    {event?.message && status === "running" && (
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        {" "}
                        — {event.message}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
            ✓ Policy Sandbox Ready
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
            Sondera is installed. Hooks will be written to{" "}
            <code style={{ fontFamily: "JetBrains Mono, monospace" }}>.claude/settings.json</code>{" "}
            in your project directory each time a Policy session starts.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button style={primaryBtnStyle} onClick={() => onComplete(modelChoice)}>
              Start Using Policy →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // error
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: "#ef4444" }}>
          Installation Failed
        </h3>
        {errorDetail && (
          <pre
            style={{
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 6,
              padding: "10px 12px",
              marginBottom: 12,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
              color: "#fca5a5",
            }}
          >
            {errorDetail}
          </pre>
        )}
        {fixInstructions && (
          <pre
            style={{
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
              color: "var(--text-muted)",
              marginBottom: 16,
              whiteSpace: "pre-wrap",
            }}
          >
            {fixInstructions}
          </pre>
        )}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button style={secondaryBtnStyle} onClick={onCancel}>
            Cancel
          </button>
          <button
            style={primaryBtnStyle}
            onClick={() => {
              setEvents([]);
              setErrorDetail(null);
              setFixInstructions(null);
              setStep("installing");
            }}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 600,
};

const cardStyle: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 24,
  width: 460,
  maxWidth: "90vw",
  maxHeight: "85vh",
  overflowY: "auto",
};

const optionStyle = (selected: boolean): React.CSSProperties => ({
  padding: "10px 12px",
  marginBottom: 6,
  borderRadius: 8,
  border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
  background: selected ? "var(--accent-subtle)" : "transparent",
  cursor: "pointer",
});

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  background: "var(--accent)",
  color: "white",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 13,
};
