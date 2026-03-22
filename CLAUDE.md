# Supermuschel — Claude Code Brief

## What This Is

**Supermuschel** is an Electron desktop app (macOS + Linux) that wraps Claude Code and OpenCode (SST) as AI agents, with first-class tiered sandboxing baked into the UI. The name is German for "super shell" (muschel = shell/clam). It is a clean-room MIT reimplementation inspired by the Apache 2.0 app Superset.

**Phase 1 PoC differentiators:**
1. **Supreme UI/UX** — dark/light adaptive, more premium than Conductor
2. **Tiered sandboxing** — the only tool that ships "YOLO mode, home directory stays home" by default
3. **Agent-writable sidebar** — agents update their own status badges in real-time via a CLI tool

Phase 2 scope is listed in `docs/phase-2.md` — do not implement anything from there in Phase 1.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Desktop shell | Electron (latest stable) |
| Build tool | electron-vite |
| Renderer | React 19 + Tailwind v4 |
| Routing | TanStack Router |
| IPC | tRPC via electron-trpc |
| Local DB | Drizzle ORM + better-sqlite3 |
| Validation | Zod |
| Terminal | xterm.js + node-pty |
| Monorepo | Turborepo + Bun |
| Linting | Biome (replaces ESLint + Prettier) |
| Language | TypeScript 5.x strict |

---

## Monorepo Structure

```
supermuschel/
├── apps/
│   └── desktop/                   # Electron app
│       ├── electron/              # Main process
│       │   ├── main.ts
│       │   ├── preload.ts
│       │   ├── ipc/               # tRPC router + procedures
│       │   ├── sandbox/           # delegates to @supermuschel/sandbox
│       │   ├── agents/            # agent process manager (claude.ts, opencode.ts)
│       │   └── socket/            # Unix domain socket server
│       └── src/                   # Renderer (Vite + React)
│           ├── components/
│           │   ├── layout/        # AppShell, Sidebar, MainPane
│           │   ├── terminal/      # TerminalPane (xterm.js)
│           │   ├── workspace/     # WorkspaceCard, SidebarEntry
│           │   └── sandbox/       # SandboxSelector, SandboxBadge
│           ├── pages/
│           │   ├── index.tsx      # Main workspace view
│           │   └── settings.tsx
│           ├── stores/            # Jotai atoms
│           └── hooks/
├── packages/
│   ├── shared/                    # Zod schemas + TypeScript types
│   ├── sandbox/                   # @supermuschel/sandbox engine
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── none.ts            # Level 0: passthrough
│   │   │   ├── os-sandbox.ts      # Level 1: delegates to platform backend
│   │   │   ├── seatbelt.ts        # Level 1 macOS: sandbox-exec (Seatbelt)
│   │   │   ├── bubblewrap.ts      # Level 1 Linux: bwrap (Bubblewrap)
│   │   │   └── container.ts       # Level 2: Docker/Podman
│   │   └── profiles/
│   │       └── seatbelt-default.sb
│   └── agent-api/                 # @supermuschel/agent-api
│       └── src/
│           ├── index.ts
│           ├── claude.ts
│           └── opencode.ts
├── tools/
│   └── supermuschel-cli/          # `supermuschel` binary agents can call
│       └── src/main.ts
├── turbo.json
├── package.json                   # Root Bun workspace config
├── biome.json
└── tsconfig.base.json
```

---

## Key Design Decisions

### Sandbox Levels
- **Level 0** — None (passthrough, `wrapSpawn` is identity)
- **Level 1** — OS-native sandbox via `OsSandboxBackend`: macOS uses Seatbelt (`sandbox-exec`, profile written to `/tmp/sm-<uuid>.sb`, deleted on stop); Linux uses Bubblewrap (`bwrap --ro-bind / /` with project dir writable)
- **Level 2** — Container (Podman rootless preferred, Docker fallback, or yolobox if installed)

When Level ≥ 1 is active, Claude Code is spawned with `--dangerously-skip-permissions` (the sandbox IS the safety boundary). This flag is NEVER passed at Level 0.

**Sandbox level is per terminal session, not per workspace.** The status bar shows "Next: [badge]" — the level that will be applied when the user starts a new session. Existing sessions are unaffected by changes to the selector. Different sessions within the same workspace may run under different sandbox levels simultaneously. The tab bar shows each session's sandbox level abbreviation (None / OS / Ctr / Pol) in the tab label.

### Agent-Writable Sidebar
Agents call the `supermuschel` CLI binary → writes JSON to Unix socket `/tmp/supermuschel-<workspaceId>.sock` (0600 perms) → Electron main process → tRPC subscription → React renderer.

Available CLI commands:
```bash
supermuschel set-status <key> <value> [--icon <sf-symbol>]
supermuschel set-progress <0.0-1.0>
supermuschel notify --title <title> --body <body>
supermuschel trigger-flash
```

### IPC Pattern
All main↔renderer communication goes through tRPC (electron-trpc). No direct `ipcRenderer.on` calls. The context bridge exposes only the tRPC link.

### Layout
3-column shell: Sidebar (220px fixed) | Main Pane (flex) | Context Panel (Phase 2 only).
Phase 1: single workspace pane, no worktree splitting. Sidebar is architected for Phase 2 multi-workspace without layout changes.

---

## Design Tokens

```css
/* Dark */
--bg-base: #0e1117;
--bg-sidebar: #13181f;
--bg-surface: #181d26;
--bg-hover: #1f2736;
--accent: #6366f1;          /* indigo-500 */
--text-primary: #f0f4ff;
--text-muted: #6b7280;
--border: #252d3d;
--sandbox-none: #6b7280;
--sandbox-os: #22c55e;
--sandbox-container: #3b82f6;

/* Light — same tokens, different values */
--bg-base: #f9fafb;
/* ... see implementation-plan.md §4 */
```

Fonts: Inter (UI), JetBrains Mono (terminals).

---

## Phase 1 Milestones

### M1 — Scaffold ← **current focus**
- [ ] Turborepo + Bun monorepo
- [ ] `apps/desktop` with electron-vite + React 19 + Tailwind v4 + TanStack Router
- [ ] electron-trpc setup
- [ ] Biome + tsconfig shared
- [ ] 3-column shell with design tokens
- [ ] SQLite + Drizzle

### M2 — Sandbox Engine
- [ ] `packages/sandbox` Level 0 + Level 1 (Seatbelt) + Level 2 (Container)
- [ ] tRPC procedures: `sandbox.getStatus`, `sandbox.setLevel`, `sandbox.testIsolation`
- [ ] Sandbox selector UI

### M3 — Terminal + Agents
- [ ] `packages/agent-api` — Claude Code + OpenCode spawn
- [ ] node-pty + xterm.js renderer
- [ ] tRPC streaming: `agent.output` subscription, `agent.input`

### M4 — Agent-Writable UI
- [ ] `tools/supermuschel-cli` binary
- [ ] Unix socket server in main process
- [ ] Live sidebar badge updates, progress bar, flash animation
- [ ] macOS notifications

### M5 — Polish & Release
- [ ] Onboarding flow, error states, settings screen
- [ ] `.dmg` packaging via electron-builder
- [ ] Auto-update (electron-updater)

---

## Development Commands

```bash
bun install                  # install all dependencies
bun run dev                  # start electron-vite dev mode
bun run build                # production build
bun run lint                 # Biome lint + format check
bun run typecheck            # tsc --noEmit across all packages
bun run db:migrate           # run Drizzle migrations
```

---

## Security Rules (non-negotiable)

1. Seatbelt profile written to `/tmp/sm-<uuid>.sb`, **deleted** on agent stop — never in project dir
2. Unix socket is `0600` — only owner readable
3. `--dangerously-skip-permissions` only passed at sandbox Level ≥ 1, never Level 0
4. "YOLO mode" marketing copy only shown when Level ≥ 1 is active

---

## Scope Constraints

- **No Windows** — Windows support is Phase 2
- **Single workspace** — no worktree splitting (Phase 2)
- **No cloud** — no auth, no sync, no ElectricSQL (Phase 2)
- **No beads/cass/br** — task intelligence is Phase 2
- Full Phase 2 list: `docs/phase-2.md`
