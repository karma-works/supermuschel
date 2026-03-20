# Light Sandbox — Sondera Integration Design

## Vision

Supermuschel auto-bootstraps [sondera-coding-agent-hooks](https://github.com/sondera-ai/sondera-coding-agent-hooks) as a fourth sandbox tier ("Policy"). Zero manual setup. Every action Supermuschel takes on the user's machine is disclosed in the UI. If Supermuschel cannot act autonomously (e.g. Ollama requires a password), it guides the user through the step with exact commands.

---

## What Sondera Is

Sondera is a reference monitor that wraps AI coding agents with:

- **Cedar policy enforcement** — deterministic allow/deny rules for shell commands, file ops, web fetches, and prompt content
- **YARA-X signature engine** — pattern-matching for credential theft, prompt injection, obfuscation
- **LLM classifier** (optional) — `gpt-oss-safeguard-20b` via Ollama for probabilistic data-sensitivity tagging and Information Flow Control (Bell-LaPadula lattice)

It works by installing hooks into Claude Code's `settings.json`. Each hook event (PreToolUse, PostToolUse, UserPromptSubmit, etc.) calls the `sondera-claude` binary, which sends the event to a local harness server via Unix socket RPC (tarpc) and returns Allow/Deny/Escalate to the agent.

---

## Tier Placement

| Level | Name | Mechanism | Recommended |
|-------|------|-----------|-------------|
| 0 | None | Passthrough | — |
| 1 | OS Seatbelt | macOS `sandbox-exec` | — |
| 2 | Container | Docker / Podman rootless | — |
| 3 | Policy | Sondera reference monitor | ★ **Yes** |

**Why Policy is recommended:** Cross-platform (macOS + Linux), lightweight (no container overhead), works with every agent (Claude, Cursor, Copilot, Gemini), surgical per-operation control, and transparent audit trail. Seatbelt and Container remain available for deeper OS-level isolation; they can be combined with Policy in Phase 2.

The sandbox selector badge uses the abbreviation **Pol** for this tier. Design token: `--sandbox-policy: #a855f7` (purple-500).

---

## Binary Distribution

Supermuschel downloads pre-built binaries from the sondera GitHub releases. It never builds from source.

**Target mapping:**

| macOS arch | Release artifact |
|------------|-----------------|
| Apple Silicon | `sondera-aarch64-apple-darwin.tar.gz` |
| Intel | `sondera-x86_64-apple-darwin.tar.gz` (Phase 2: Linux) |

**Release URL pattern:**
```
https://github.com/sondera-ai/sondera-coding-agent-hooks/releases/latest/download/sondera-{target}.tar.gz
```

**Archive contents:** `sondera-harness-server`, `sondera-claude`, `sondera-copilot`, `sondera-cursor`, `sondera-gemini`

**Install destination:** `~/.supermuschel/bin/` (created by Supermuschel, never in PATH by default — binaries are referenced by absolute path everywhere).

**Verification:** SHA-256 checksum is downloaded alongside the archive (`sondera-{target}.tar.gz.sha256`) and verified before extraction. If the checksum fails, installation is aborted with an error.

---

## Onboarding Wizard

The wizard appears the **first time the user selects the Policy tier** in the sandbox selector. It does not appear at app launch. It is a modal overlay on the main window, not a separate window.

The wizard stores its completion state in SQLite (`sondera_install` table: `{ completed_at, version, ollama_enabled }`). If the wizard was completed for a prior sondera version, it re-runs only the steps that changed.

### Wizard Steps

#### Step 1 — Welcome
- Headline: "Meet your AI agent bodyguard"
- 3-bullet summary of what sondera does (Cedar policies, signature scanning, optional LLM classifier)
- Explicit list of what Supermuschel will do: download binaries, install hooks into `~/.claude/settings.json`, start a background process
- CTA: "Set up Policy sandbox" / "Not now"

#### Step 2 — Download Binaries
- Detects macOS architecture (`process.arch`: `arm64` → `aarch64-apple-darwin`)
- Shows progress bar with transfer speed and ETA
- On completion: verifies SHA-256 checksum and shows green checkmark
- Extracts to `~/.supermuschel/bin/`
- If download or checksum fails → **Step: Error** (see Error Handling below)

#### Step 3 — LLM Classifier (Optional)
- Headline: "Full power mode — recommended"
- Explains: the LLM classifier (`gpt-oss-safeguard-20b`) enables Information Flow Control and probabilistic policy decisions. Without it, only Cedar rules and YARA-X signatures are active — still strong, but less nuanced.
- Shows disk space requirement: ~12 GB
- Two options:
  - **"Install Ollama + model (recommended)"** → proceeds to Step 3a
  - **"Skip for now, I'll add it later"** → proceeds to Step 4
- This choice is saved; the user can enable it later from Settings → Sandbox → Policy.

#### Step 3a — Ollama Setup
- Checks if `ollama` is in PATH:
  - **Not found:** Shows Ollama download button (opens `https://ollama.com/download` in the system browser) and a "Check again" button. Supermuschel cannot install Ollama itself (requires a .pkg installer with sudo). The wizard waits here until Ollama is detected.
  - **Found:** skips to model pull.
- Pulls the model: `ollama pull gpt-oss-safeguard-20b`
  - Runs as a child process, streams output to a log view in the wizard
  - Shows download progress from Ollama's stdout
  - If pull fails → **Step: Error**

#### Step 4 — Install Hooks
- Installs hooks at `--user` scope so they apply globally across all projects
- Writes to `~/.claude/settings.json`
- Creates a timestamped backup first: `~/.claude/settings.json.backup.<YYYYMMDD_HHMMSS>.json`
- The wizard shows the exact diff that will be applied (collapsed by default, expandable)
- Supermuschel runs: `~/.supermuschel/bin/sondera-claude install --user`
- On success: green checkmark
- On failure → **Step: Error**

#### Step 5 — Done
- Summary of what was installed
- "Policy sandbox is now active. Your next session will be protected."
- Shows the socket path that will be used: `~/.sondera/sondera-harness.sock`
- Link to default policies: opens `~/.supermuschel/policies/` in Finder

---

## Harness Lifecycle

**Scope:** one global harness process for all workspaces. Started on first session that uses the Policy tier. Not started at app launch.

**Startup:**
```
~/.supermuschel/bin/sondera-harness-server \
  --socket ~/.sondera/sondera-harness.sock \
  --policy-path ~/.supermuschel/policies/
```

**Managed by:** Electron main process (`electron/agents/sondera.ts`). The main process:
1. Checks if the socket file exists and is responsive before spawning a new instance (idempotent start).
2. Spawns the harness as a detached child process with `stdio: 'pipe'`.
3. Pipes stderr to the app log (`~/.supermuschel/logs/sondera-harness.log`).
4. Keeps a reference to kill the process on app quit (`app.on('before-quit')`).
5. Re-spawns automatically if the process exits unexpectedly while a Policy session is active (one retry; if it fails again, the session is blocked — see Error Handling).

**Socket:** `~/.sondera/sondera-harness.sock`, permissions 0600.

**Policy files:** shipped inside the Supermuschel app bundle as defaults, copied to `~/.supermuschel/policies/` on first use. The user can edit them manually; Supermuschel never overwrites a modified file. The shipped defaults are the sondera upstream defaults (base.cedar, destructive.cedar, file.cedar, ifc.cedar, supply_chain_risk.cedar).

---

## Hook Installation Detail

When a Policy-tier session starts, `sondera-claude` hooks are active at `--user` scope in `~/.claude/settings.json`. The hook commands reference the absolute path `~/.supermuschel/bin/sondera-claude`. This means:

- Claude Code sessions launched outside Supermuschel also get the hooks (by design — the protection follows the agent, not the launcher).
- The user is told this explicitly in the wizard (Step 1 disclosure).
- Uninstall (Settings → Sandbox → Policy → Remove) calls `~/.supermuschel/bin/sondera-claude uninstall --user` and restores the backup.

Hook events installed: PreToolUse, PermissionRequest, PostToolUse, PostToolUseFailure, UserPromptSubmit, Notification, Stop, SubagentStart, SubagentStop, TeammateIdle, TaskCompleted, PreCompact, SessionStart, SessionEnd.

---

## Error Handling

**No degradation mode.** If any required component is missing or broken, the Policy-tier session does not start. A blocking error modal is shown with:

1. **What failed** — specific component (harness, binary, hook, socket, checksum)
2. **Why it failed** — full error message / stderr output in a scrollable log view
3. **How to fix it** — step-by-step manual remediation instructions
4. **"Retry"** button — re-attempts the failed step without re-running the full wizard
5. **"Use a different sandbox"** button — lets the user fall back to Seatbelt or Container without losing their Policy setup state

**Specific error cases:**

| Failure | Message | Manual fix shown |
|---------|---------|-----------------|
| Download fails (network) | "Could not reach GitHub releases" | Check network, retry, or download manually and place at `~/.supermuschel/bin/` |
| Checksum mismatch | "Binary integrity check failed" | Re-download; if persistent, file a GitHub issue |
| Hook install fails | "Could not write to ~/.claude/settings.json" | Check file permissions; shown exact `chmod` command |
| Harness won't start | "sondera-harness-server exited with code N" | Full stderr log shown; link to sondera GitHub issues |
| Harness crashes mid-session | "Policy harness lost — session blocked" | Restart Supermuschel; log path shown for manual inspection |
| Socket not found after harness start | "Harness started but socket not created within 5s" | Shown socket path; check disk space and permissions |

---

## tRPC Procedures (new)

```typescript
// packages/shared/src/schemas/sondera.ts
// sandbox.sondera namespace

sandbox.sondera.getStatus()
// → { installed: boolean, version: string | null, ollama: boolean, harnessRunning: boolean }

sandbox.sondera.install()
// → subscription: streams wizard step events { step, status, message, progress? }

sandbox.sondera.uninstall()
// → { ok: boolean }

sandbox.sondera.startHarness()
// → { ok: boolean, socketPath: string }

sandbox.sondera.stopHarness()
// → { ok: boolean }

sandbox.sondera.getHarnessHealth()
// → { running: boolean, pid: number | null, uptime: number | null }
```

---

## Implementation Plan

### Phase 1 scope (current)

1. **`packages/shared`** — Add Zod schemas for sondera status, install events, harness health.
2. **`electron/agents/sondera.ts`** — Harness process manager (spawn, health-check, restart, quit).
3. **`electron/ipc/sandbox.ts`** — Add `sandbox.sondera.*` tRPC procedures.
4. **`packages/sandbox/src/policy.ts`** — Level 3 wrapper: checks harness health before session start; throws if not running.
5. **`apps/desktop/src/components/sandbox/SondераWizard.tsx`** — Multi-step modal wizard (Steps 1–5).
6. **`apps/desktop/src/components/sandbox/SandboxSelector.tsx`** — Add Policy option with ★ badge and purple token.
7. **DB migration** — Add `sondera_install` table.
8. **Binary management** — Download, checksum verify, extract utility in main process (`electron/lib/sondera-installer.ts`).
9. **Policy files** — Bundle upstream defaults in `apps/desktop/resources/policies/`, copy to `~/.supermuschel/policies/` on install.

### Out of scope for Phase 1 (→ Phase 2)

- Cedar policy editor UI
- IFC sensitivity label visualization in sidebar
- Combining Policy tier with Seatbelt/Container
- Linux support
- Per-workspace policy overrides
- Harness log viewer in-app
