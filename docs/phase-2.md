# Supermuschel — Phase 2 Scope

> Items listed here are **explicitly out of scope for Phase 1 (PoC)**. They are tracked here to inform the Phase 1 architecture (so we don't paint ourselves into a corner).

---

## Platform Expansion
- **Linux support** — requires bubblewrap (`bwrap`) as sandbox Level 1 on Linux/WSL2. Architecture is ready (sandbox backends are pluggable), just not implemented.
- **Windows support** — Windows Sandbox or WSL2 + bubblewrap. Lower priority.
- **Pure TUI mode** (FrankenTUI) — a terminal-only client for SSH/server use, sharing all business logic with the Electron app.

## Workspace Expansion
- **Git worktree management** — multiple parallel workspaces, each on a separate branch, managed by the app. Phase 1 uses a single workspace.
- **Multi-agent pane layout** — side-by-side terminal panes, one per agent, orch.one-style.
- **Branch picker + git integration** (`simple-git`) in the sidebar.

## Task Intelligence
- **`beads_rust` (`br`) integration** — local-first SQLite+JSONL issue tracker per workspace. Sidebar task list, agent-claimable tasks.
- **`beads_viewer` (`bv`) integration** — DAG visualization, PageRank task priority, "Mission Control" panel, critical path analysis, parallel agent execution plans.

## Cross-Agent Memory
- **`cass` (coding_agent_session_search) integration** — cross-agent session history search. Sidebar panel, MCP tool exposed to agents, session search from workspace context.

## Orchestration & Governance
- **State machine governance** — `todo → in_progress → review → done` for each task/worktree.
- **Agent team roles** — CTO/Backend/QA/Reviewer roles (from orch.one research).
- **Inter-agent messaging** — shared key-value context store, broadcast, direct message.
- **Rework loop** — reject agent output with notes → agent retries with rejection context.
- **Goal decomposition** — type a high-level goal, meta-agent breaks it into `br` tasks.

## 24/7 Daemon Mode
- **`supermuschel serve`** — headless daemon (launchd/systemd), keeps agents running when the GUI is closed. Structured JSON logs, graceful shutdown.
- **CI/CD `once` mode** — `supermuschel run --once` processes all queued tasks and exits with code 0/1.
- **E2B cloud sandbox** (Level 4) — Firecracker microVM execution backend for daemon mode.

## Code Review
- **Diff viewer** — syntax-highlighted file diffs per agent task.
- **Review queue** — accept/reject/rework buttons for agent output before merge.
- **Auto merge-back** — agent finishes → changes merge to main via `simple-git`.

## Enhanced Sandbox Levels
- **Level 3 (VM-backed)** — Lima + container, separate kernel per agent.
- **Level 4 (cloud)** — E2B Firecracker microVM, off-device execution.
- **Apple Container framework** — replacement for deprecated `sandbox-exec` on macOS Tahoe (26)+.

## UI/UX Extensions
- **Timeline view** — Gantt-style history of agent activity, correlated with git commits.
- **Sprint dashboard** — from `beads_viewer`: kanban, velocity, week/sprint view.
- **Snapshot time-travel** — view task/issue state at any historical git snapshot.
- **Static site export** — `beads_viewer` project board as a shareable HTML file.
- **Voice control** — whisper.cpp (MIT) local speech-to-text for hands-free commands.

## Cloud & Collaboration
- **Git-based sync** — push `.beads/` and `.cass/` session data as git artifacts. Zero cloud.
- **Optional account system** — multi-device sync, shared team workspace.
- **MCP server** — expose `cass` search, `br` task management, `bv` plans as MCP tools accessible by any agent without explicit integration.

## Other Agents
- **Additional agent integrations** — Gemini CLI, Codex CLI, Cursor, Aider, Copilot (beyond Claude Code and OpenCode).
