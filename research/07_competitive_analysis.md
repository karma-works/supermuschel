# Supermuschel — Competitive Analysis

> Competitors analyzed: **Conductor**, **cmux**, **Orch.one**  
> Compared against: **Superset.sh**

---

## 1. Conductor (`conductor.build`)

### Overview
A macOS desktop GUI app (similar positioning to Superset). Creates parallel Claude Code / Codex agents in isolated git worktree workspaces. Focus: beautiful UI, human-in-the-loop review, easy onboarding.

> "Create parallel Codex + Claude Code agents in isolated workspaces. See at a glance what they're working on, then review and merge their changes."

- macOS only
- Closed source
- Free tier assumed
- Very polished UI (praised by Notion designers, Stripe engineers)
- Trusted by: Supermemory, Stripe, Life360, Tigris Data, Notion, Sesame

### Where Conductor is Superior to Superset

| Feature | Superset | Conductor |
|---|---|---|
| **UX polish** | Good | **Exceptional** — praised by Notion/Stripe design engineers |
| **Review & merge UI** | Diff viewer | **Dedicated review + merge workflow** |
| **Marketing** | Developer-focused | **Broader appeal** (testimonials from founders, designers, not just devs) |
| **Onboarding** | Setup scripts required | **Dead simple** — add repo, spin up agent, done |

### Pain Points / Gaps (where Conductor is weak)
- Cloud/auth requirements unknown — likely account gate
- No open source
- macOS only with no TUI fallback
- No task intelligence / DAG planning
- No cross-agent memory
- No headless/daemon mode

### Ideas to Borrow for Supermuschel
- ✅ **Three-step onboarding flow**: "Add repo → Deploy agent → Conduct" — extremely clear mental model
- ✅ **Prominent code review UI** as a first-class feature alongside the terminal — review before merge, with a dedicated accept/reject/rework button
- ✅ **Testimonial-driven trust** — the "builders trust this" social proof pattern prominently on main page
- ✅ **"Conduct" framing** — the product has clear language: you are the conductor, agents are the orchestra. Compelling narrative.

---

## 2. cmux (`cmux.app`)

### Overview
A **native Swift macOS application** (using AppKit + libghostty terminal emulation + WebKit browser panes + Bonsplit layout system). Completely different approach from Superset/Conductor — cmux is controlled *by AI agents themselves* via a CLI tool writing to a Unix domain socket.

Key insight: **the agent controls the UI**, not just the code.

### Technology Stack
- **Swift + AppKit** — native Mac app, GPU-accelerated, far lighter than Electron
- **libghostty** — the terminal emulation library from the Ghostty terminal project
- **WebKit** — full in-app browser panes with Safari DevTools
- **Bonsplit** — custom split/tab layout library with animations and drag-and-drop
- **Unix domain socket** (`/tmp/cmux.sock`) — IPC between agent subprocesses and the UI

### How Agent-Controlled UI Works
The agent doesn't just execute code — it manages its own workspace layout:
```bash
cmux new-split right --workspace workspace:1       # split pane
cmux send --surface surface:7 "claude"             # launch sub-agent
cmux set-status branch main --icon arrow.triangle.branch  # update sidebar badge
cmux set-progress 0.75                             # show 75% progress bar
cmux notify --title "Done" --body "Review ready"  # system notification
cmux trigger-flash --surface surface:8             # flash blue border for attention
cmux read-screen --surface surface:7              # read pane output
cmux close-surface --surface surface:7             # clean up
```

### Sub-Agent Architecture
A primary agent can spawn sub-agents, assign tasks to them, monitor their output via `cmux read-screen`, and close them when done. This enables sophisticated multi-agent workflows within a single workspace — beyond what Superset can do.

### Where cmux is Superior to Superset

| Feature | Superset | cmux |
|---|---|---|
| **Performance** | Electron (heavy) | **Native Swift, GPU-accelerated** |
| **Memory footprint** | High (Electron) | **Very low (native)** |
| **Agent-controllable UI** | None | **Full API: split, send, read, notify, badge, progress** |
| **Browser pane** | Basic in-app browser | **WebKit with full Safari DevTools** |
| **Sidebar status badges** | None | **Agents write live status: branch, progress %, custom icons** |
| **Sub-agent orchestration** | None | **Primary agent spawns + manages sub-agents** |
| **Notifications** | Limited | **macOS system notifications + in-pane visual flash** |
| **Claude Code hooks** | None | **Hook system for session start/end events** |

### Pain Points / Gaps
- No git worktree management (agent must handle git manually)
- No task tracker / DAG planning
- No cross-agent session search
- macOS-only (native Swift)
- No headless/daemon mode

### Ideas to Borrow for Supermuschel
- ✅ **Agent-Writable UI API** — biggest differentiator. Every workspace should have a `supermuschel` CLI that agents can use to:
  - Write status badges to the sidebar
  - Send macOS notifications
  - Trigger visual flashes on panes
  - Set progress indicators
  - Spawn sub-agents in new panes
  - Read screen output of sibling panes
- ✅ **Sidebar as live status board** — not just a list of workspaces but a real-time data display that agents update programmatically
- ✅ **Visual flash / `trigger-flash` semantics** — when an agent needs attention, flash its border. Simple, brilliant.
- ✅ **`set-progress` bar on workspace entries** — gives ambient awareness at a glance
- ✅ **Sub-agent spawning pattern** — primary agent orchestrates specialist sub-agents within a workspace. Map this to the orch.one model (see below).
- ✅ **Hook system** — declarative hooks for agent lifecycle events, not polling

> **Architecture note**: Supermuschel will be Electron (not native Swift), so GPU-level performance gains won't match. However, we can match the *API model* completely by implementing the `supermuschel` CLI sidecar that communicates with the Electron main process over IPC — achieving the same agent-controllable UI effect.

---

## 3. Orch.one

### Overview
**Open-source (MIT), CLI-first multi-agent orchestrator**. No GUI today — pure CLI + TUI. State stored as YAML/JSON/JSONL in `.orchestry/`. Runs headless 24/7 as a daemon (`orch serve`). Focus: autonomous, unattended agent execution with state machine governance and inter-agent communication.

```bash
npm install -g @orch/cli
orch init
orch task add "Implement OAuth flow" --scope backend --priority high
orch run --agents 4
# close laptop — orch serve keeps running on your VPS
```

### Key Features

#### State Machine Governance
Every task flows through: `todo → in_progress → review → done`  
Human approval required before merge. Reject with feedback → agent retries.

#### Agent Teams with Roles
Not just parallel agents — **organized teams**:
- **CTO agent**: decomposes goals into tasks, assigns to teams
- **Backend team**: implements features
- **QA team**: tests
- **Reviewer agent**: code reviews
- **Content team**: docs, blog posts

#### Inter-Agent Communication
- Direct messaging between agents
- Broadcasts to team or all agents
- **Shared key-value context store** — any agent can read/write
- Messages injected into agent prompts at dispatch time

#### 24/7 Daemon Mode
`orch serve` runs headless. Deploy with `pm2` or `systemd`. Structured JSON logs for Datadog/Grafana. Agents work while you sleep.

#### Zero Infrastructure
No cloud, no database, no Docker, no signup. Everything in `.orchestry/`.

#### Rework Loop
Human rejects a task with feedback → agent retries with the rejection notes in context.

### Where Orch.one is Superior to Superset

| Feature | Superset | Orch.one |
|---|---|---|
| **Headless/Daemon mode** | None — must be open | **`orch serve` — 24/7 unattended** |
| **Agent teams with roles** | None | **CTO/Backend/QA/Reviewer roles** |
| **Inter-agent messaging** | None | **Direct messages, broadcasts, shared context store** |
| **State machine governance** | None | **todo→in_progress→review→done** |
| **Rework loop** | None | **Reject → retry with feedback context** |
| **Goal decomposition** | None | **CTO agent breaks goal → tasks automatically** |
| **Background ops** | None | **Work while you sleep. Wake to PRs.** |
| **License** | Apache 2.0 | **MIT** |
| **Cloud required** | Yes (ElectricSQL) | **Zero cloud, fully local** |
| **CI integration** | None | **`orch once` — runs all tasks then exits 0/1** |

### Pain Points / Gaps
- No GUI — pure CLI/TUI only
- No built-in diff viewer or code review UI
- No terminal UI comparable to Superset's xterm.js integration
- No cross-agent memory (no `cass` equivalent)
- `npm install` — TypeScript/JS, not the most performant runtime for orchestration

### Ideas to Borrow for Supermuschel
- ✅ **`orch serve` headless daemon mode** — this is a huge gap in Superset. Supermuschel should have a daemon mode that keeps agents running 24/7 even when the GUI is closed
- ✅ **State machine governance**: `todo → claimed → in_progress → review → done` — structure agent work in Supermuschel with explicit state transitions, not just "running or not"
- ✅ **Agent team roles**: CTO/Backend/QA/Reviewer. Map these to `bv`'s parallel execution tracks — each track is a team
- ✅ **Shared context store** — a simple key-value store that any agent can read/write, injected into prompts at dispatch. Perfect complement to `cass` history search
- ✅ **Rework loop**: human rejects, agent retries with rejection notes. Add a `👎 Rework` button to the diff/review UI in Supermuschel
- ✅ **Goal decomposition**: type a high-level goal, a "CTO agent" breaks it into sub-tasks that populate as `br` beads automatically
- ✅ **CI/CD `once` mode**: `supermuschel run --once` processes all queued tasks and exits — integrate into GitHub Actions / CI pipelines
- ✅ **Structured JSON logs** to stdout — even the GUI app should emit structured telemetry for power users piping to observability tools

---

## Consolidated Competitive Positioning Map

```
                     ─── Cloud Dependency ───
                  None ◄──────────────────────► Heavy
                   │                              │
    Full GUI ───── │  supermuschel (goal)         │
    (Electron)     │  Conductor                   │ Superset
                   │                              │
                   │                              │
    Hybrid ─────── │  cmux (native)              │
                   │                              │
                   │                              │
    TUI/CLI ─────  │  orch.one ←─────────────────┘
                   │

                 Increasing agent autonomy →
    Watch agents ──────────────────► Agents self-direct
    Superset    Conductor   cmux        orch.one   supermuschel (goal)
```

---

## Master "Steal This Feature" List

Ranked by impact:

| Priority | Feature | Source | Why |
|---|---|---|---|
| 🔥🔥🔥 | Agent-Writable UI API (`set-status`, `set-progress`, `trigger-flash`, `notify`) | cmux | Transforms agents from black boxes into observable, communicating workers |
| 🔥🔥🔥 | 24/7 Headless Daemon mode (`supermuschel serve`) | orch.one | Biggest gap in all GUI tools — agents die when you close the lid |
| 🔥🔥🔥 | State machine governance: `todo→in_progress→review→done` | orch.one | Adds structure and human control without babysitting |
| 🔥🔥 | Agent team roles (CTO/Backend/QA/Reviewer) | orch.one | Shifts from "parallel agents" to "coordinated team" — different product category |
| 🔥🔥 | Rework loop (reject + retry with feedback) | orch.one | Human stays in the loop without re-prompting from scratch |
| 🔥🔥 | Goal decomposition (CTO agent → tasks → beads) | orch.one | Reduces human setup overhead from O(tasks) to O(1) per goal |
| 🔥🔥 | Sidebar as live agent status board | cmux | Ambient awareness without watching terminals |
| 🔥🔥 | Three-step onboarding: Add repo → Deploy agent → Conduct | Conductor | Lowest time-to-value in the market |
| 🔥 | Sub-agent spawning within a workspace | cmux | Enables specialist micro-agents inside a workspace |
| 🔥 | Shared context store (key-value, prompt injection) | orch.one | Enables genuine agent collaboration |
| 🔥 | Code review as first-class feature (accept/reject/rework button) | Conductor | Partners well with the rework loop |
| 🔥 | Claude Code hook system (session start/end triggers) | cmux | Declarative vs. polling |
| 🔥 | CI/CD `once` mode | orch.one | Opens enterprise/automation use case |
