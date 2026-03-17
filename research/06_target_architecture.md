# Supermuschel — Target Architecture

> Goal: Be **better than superset.sh in every aspect**, under MIT license.

---

## Vision

Superset is an excellent product, but it has a clear ceiling: it is a **GUI-only** tool that wraps terminals inside an Electron window. It has a cloud sync dependency (ElectricSQL), a proprietary auth wall, and no structured understanding of *what* agents are working on — only *where* they are running.

**Supermuschel** aims to be the IDE for teams who want:**
1. **Zero cloud dependency** — everything runs locally, with optional sync
2. **Structured task intelligence** — agents know what to work on next, not just where to run
3. **Cross-agent memory** — today's agent learns from every past agent session
4. **A world-class terminal experience** — inside a slim Electron shell *or* pure TUI
5. **Open, composable architecture** — every component is independently useful

---

## Proposed Component Stack

### 1. FrankenTUI (`frankentui`) — UI Kernel

**Repo**: https://github.com/Dicklesworthstone/frankentui  
**Language**: Rust  
**License**: MIT (confirm)

#### What it is
A minimal, high-performance Rust TUI **kernel** — not a full framework. Uses the Elm architecture (Model-View-Update), diff-based rendering, inline mode (scroll-preserving), RAII terminal cleanup, and a suite of seriously impressive algorithms: Bayesian diff strategy selection, BOCPD change-point detection, CUSUM drift detection, Fenwick trees for virtual lists, PID frame pacing.

#### Verdict: ✅ Strong integration candidate — **with caveats**

| Strength | Risk |
|---|---|
| Zero unsafe Rust — correctness guaranteed | **Early-stage, unstable API** |
| Inline mode (logs keep scrolling ← huge) | Thin widget ecosystem today |
| Already powers `cass` (good real-world test) | Not a Ratatui replacement yet |
| Bayesian diff engine for flicker-free rendering | macOS-only terminal compat not guaranteed |
| WASM compilation tested (frankenterm-web) | One primary author, low bus factor |

> **Challenge**: FrankenTUI positions itself as a *kernel*, not a batteries-included framework. Building our entire UI on it would mean writing substantial widget code ourselves. This is viable *if* we treat it as our rendering back-end and invest real effort in a widget layer. The alternative is **Ratatui** (the dominant Rust TUI lib) which has a mature ecosystem, and port FrankenTUI's diff algorithms as an optimization later.

**Recommendation**: Use FrankenTUI as the terminal renderer for the **pure-TUI entry point** of supermuschel. It is already the engine behind `cass` (which we integrate), so the codebase relationship is tight. For the Electron shell's xterm.js renderer, this is irrelevant.

---

### 2. `cass` (coding_agent_session_search) — Cross-Agent Memory

**Repo**: https://github.com/Dicklesworthstone/coding_agent_session_search  
**Language**: Rust  
**License**: MIT (confirm)

#### What it is
A unified CLI + TUI for indexing and searching coding agent session history across **11+ providers** (Claude, Codex, Gemini, Cursor, Aider, etc.). Sub-60ms lexical search (Tantivy + BM25 with edge N-grams), optional local semantic search (MiniLM via FastEmbed), hybrid search with RRF fusion. Built on FrankenTUI + Elm architecture.

Key superpower: **robot mode** — structured JSON output so AI agents can query their own past sessions.

#### Verdict: ✅ Integrate as first-class feature — this is a genuine differentiator

Superset has **zero cross-agent memory**. An agent starting a new task has no idea what past agents discovered. `cass` solves exactly this. Integrating it into supermuschel means:

- When a new workspace/agent starts, supermuschel can show "Past sessions related to this codebase"
- The active agent can query all past agent sessions via MCP tool
- You can search your company's entire coding history from the workspace sidebar

> **Challenge to your suggestion**: `cass` is a standalone CLI tool. Integration means either:
> - **Embedding it as a sidecar process** (simplest — spawn `cass` as a child process, use JSON output)
> - **Embedding as a Rust library** (harder — requires it to expose a library API, which it may not today)
> - **Wrapping it in a panel inside the desktop app** (best UX — an embedded xterm.js panel running `cass`)
>
> The sidecar + MCP tool approach is cleanest. `cass` already has a machine-readable API designed exactly for this use case.

**Recommendation**: Integrate via sidecar (spawned subprocess). Expose `cass` as an MCP tool in the supermuschel MCP server so every agent can search history automatically.

---

### 3. `beads_rust` (`br`) — Local-First Issue Tracking

**Repo**: https://github.com/Dicklesworthstone/beads_rust  
**Language**: Rust (~20K lines)  
**License**: MIT (confirm)

#### What it is
A Rust port of Steve Yegge's `beads` issue tracker. Stores issues in **SQLite + JSONL** (fast local queries + git-friendly collaboration). Non-invasive (only touches `.beads/`), agent-first (`--json` output for every command), no cloud required.

The key concept: issues live next to your code, travel with your git commits, and are readable/writable by AI agents without human friction.

#### Verdict: ✅ Integrate — this replaces cloud-based issue trackers for our users

Superset uses GitHub Issues as its external issue tracker (via Octokit integration). That requires a GitHub account, network access, and is invisible without a browser. `br` keeps everything local and in-repo.

> **Challenge to your suggestion**: `br` is a *CLI tool* for issue tracking — it is **NOT a replacement for git worktrees**. These solve entirely different problems:
> - **Git worktrees**: One git repo checked out at multiple branches simultaneously — so you can run agents in parallel on different branches without stashing
> - **Beads/br**: Local issue tracking — *what* is to be done
>
> You need both. You definitely should not remove git worktrees. They are the mechanism that makes parallel agent isolation possible.

**Recommendation**: Integrate `br` as the **built-in task manager** per workspace. Supermuschel shows `br list` in the sidebar, lets agents claim tasks (`br take`), and marks them done (`br close`). NOT a replacement for worktrees.

---

### 4. `beads_viewer` (`bv`) — DAG-Aware Task Intelligence

**Repo**: https://github.com/Dicklesworthstone/beads_viewer  
**Language**: Go  
**License**: MIT (confirm from chunk 120)

#### What it is
A graph-aware TUI for `beads`. Treats the issue tracker as a **DAG** (Directed Acyclic Graph) and computes: PageRank, betweenness centrality, HITS, critical path, eigenvector centrality, topological sort, cycle detection. Result: it can tell you *which issue to work on next* to unblock the most work, which issues are bottlenecks, and emit a parallel execution plan for multiple agents.

Key features: kanban board, sprint dashboard, snapshot time-travel, static site export, **deep `cass` integration** (correlates issues to past agent sessions).

#### Verdict: ✅ Integrate — this is a massive differentiator over Superset

Superset has no task intelligence whatsoever. It runs agents; it doesn't help you *direct* them. `bv` adds a "mission control" layer: what should each of my N parallel agents be working on to ship fastest?

> **Challenge**: `bv` is Go, `cass` is Rust, `br` is Rust, FrankenTUI is Rust, the desktop is TypeScript/Electron. You have a 3-language stack here (TS, Rust, Go). This is manageable but needs to be intentional:
> - Ship `br` and `bv` as **bundled sidecar binaries** (precompiled, auto-updated)
> - Ship `cass` as a sidecar binary
> - All communicate via JSON/stdio with the Electron main process
> - This is the exact same pattern VS Code uses for language servers

**Recommendation**: Bundle `bv`, `br`, `cass` as sidecar binaries. Show `bv`'s insights in a dedicated **"Mission Control"** panel where you can assign issues to agents with one click.

---

## Proposed Supermuschel Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPERMUSCHEL DESKTOP APP                            │
│  (Electron 40 + electron-vite + React 19 + TanStack Router + Tailwind v4)  │
├─────────────────┬──────────────────┬──────────────────┬──────────────────── │
│  Mission Control  │  Workspaces       │  Terminal Panes  │  Context Panel      │
│  (bv DAG view)   │  (git worktrees)  │  (xterm.js)      │  (cass history)     │
│                  │                  │  (node-pty)      │                      │
├──────────────────┴──────────────────┴──────────────────┴─────────────────────┤
│                         Electron Main Process (Bun/Node)                     │
│  tRPC IPC │ SQLite/Drizzle │ simple-git │ @parcel/watcher │ Hono HTTP        │
├──────┬────────┬────────┬────────┬──────────────────────────────────────────  │
│  br  │  bv    │  cass  │  MCP   │  Sidecar Manager                           │
│ (Rust│ (Go)   │ (Rust) │ Server │  (spawn, health-check, IPC via JSON/stdio) │
└──────┴────────┴────────┴────────┴────────────────────────────────────────────┘
```

### The "Sidecar Manager" Pattern

All external tools (`br`, `bv`, `cass`) are bundled as precompiled binaries inside the Electron app (`resources/bin/`). The main process:
1. Spawns each sidecar as a child process
2. Communicates via stdin/stdout JSON (all three tools have `--json`/`--robot` modes)
3. Manages their lifecycle (restarts on crash, graceful shutdown on quit)
4. Exposes their output via tRPC to the renderer

This is well-precedented: VS Code does the same with TypeScript language server, Copilot, etc.

---

## Where We Beat Superset

| Dimension | Superset | Supermuschel |
|---|---|---|
| **Task Direction** | None — agents run blind | `bv` DAG → tells each agent what to work on next |
| **Cross-Agent Memory** | None | `cass` — search all past agent sessions |
| **Issue Tracking** | GitHub Issues (external) | `br` — local-first, git-embedded, agent-native |
| **Cloud dependency** | ElectricSQL required for sync | Optional — everything works offline |
| **Auth wall** | Account required | Local-first, account optional |
| **License** | Apache 2.0 (restrictions) | MIT |
| **Platform** | macOS only | macOS first, Linux/Windows later (TUI mode works cross-platform immediately) |
| **Agent protocol** | Proprietary MCP | Open MCP + `cass` robot mode + `bv` robot mode |
| **Pure TUI mode** | Not available | FrankenTUI-based terminal client (e.g. for server/SSH use) |
| **Task visualization** | None | `bv` kanban, DAG, sprint dashboard |
| **Sprint planning** | None | `bv` parallel execution plans for N agents |

---

## Ideas & Suggestions (Beyond Your Proposals)

### Idea 1: "Agent Orchestrator" mode
Instead of just running agents in parallel and watching them, add a *meta-agent* that:
- Queries `bv --robot-triage` to get the current task priority list
- Assigns tasks to available agents automatically
- Monitors agent output for "stuck" signals (long silence, error loops)
- Spins up a new agent on the next `bv` task when one finishes

### Idea 2: Voice Control
The original Superset desktop has a `VOICE_AGENT_PLAN.md` file — they're planning it. Beat them to it:
- Use `whisper.cpp` (MIT, runs locally) for speech-to-text
- Allow voice commands: "start a new workspace for the login bug", "show me what cass found about JWT errors"

### Idea 3: Pure TUI Mode (no Electron)
Many power users (devs on servers, in tmux, over SSH) won't install a desktop app. Build a FrankenTUI-based terminal client that gives 80% of the UX in a terminal. `cass` already proves this stack works.

### Idea 4: Cross-Machine Sync via Git
Since `br` stores issues in `.beads/issues.jsonl` (in your git repo), and `cass` stores sessions locally, offer **git-based sync** — push `.beads/` and `.cass/` as git artifacts. Zero cloud required, works with any git host.

### Idea 5: Timeline of Agent Work
Show a Gantt-style timeline of which agents worked on which tasks, when, and what they changed. Combine `bv` task history + `cass` session timestamps + `simple-git` commit log.

---

## Risk Analysis

| Risk | Severity | Mitigation |
|---|---|---|
| FrankenTUI API instability | Medium | Pin a specific commit; own the upgrade cycle |
| `bv` is Go, rest is Rust/TS | Low | Sidecar pattern isolates it completely |
| `br`/`bv`/`cass` are single-author projects | High | Fork them; maintain internally if author diverges |
| beads ecosystem is niche | Medium | The concept (local issue tracking) is universal; swap impl if needed |
| Electron size/performance | Low | Same trade-off Superset makes; TUI mode as alternative |

---

## Clarification Needed

> ⚠️ You mentioned "instead of git worktrees: beads_viewer and beads_rust" — this suggests replacing git worktrees with the beads system. We need to talk about this.

**Git worktrees** are what give each agent an **isolated filesystem** to work in — without this, two agents modifying the same branch would conflict immediately. Beads/bv/br are **issue trackers** — they tell agents *what* to work on, not *where*. These are orthogonal.

**Recommendation**: Keep git worktrees as the isolation mechanism. Add `br` + `bv` as the task intelligence layer on top. Both are necessary and complementary.
