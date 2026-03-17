# Supermuschel — Phase 1 Implementation Plan

> **PoC Goal**: A macOS-only Electron desktop app that is visually superior to Conductor, integrates Claude Code and OpenCode as AI agents, and is the first tool in the market with first-class, tiered agent sandboxing baked directly into the UI.

---

## 1. Vision & Differentiators

Supermuschel Phase 1 is **not** feature-parity with Superset. It ships a tightly scoped, highly polished experience around three pillars:

1. **Supreme UI/UX** — dark/light adaptive, feels more premium than Conductor
2. **Tiered sandboxing** — the only tool that ships "YOLO mode, home directory stays home" by default
3. **Agent-writable sidebar** — agents update their own status badges in real-time (from cmux research)

Everything listed in [`phase-2.md`](./phase-2.md) is explicitly out of scope.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Desktop shell | **Electron** (latest stable) | Market-validated; Superset/Conductor both chose it |
| Build tool | **electron-vite** | Fastest Vite + Electron integration, HMR in renderer |
| Renderer | **React 19** + **Tailwind v4** | Same as Superset, large ecosystem |
| Routing | **TanStack Router** | File-based, type-safe, Superset-proven |
| IPC | **tRPC** via **electron-trpc** | Type-safe bridge between main and renderer |
| Local state / DB | **Drizzle ORM** + **better-sqlite3** | Lightweight, zero-config local persistence |
| Validation | **Zod** | Shared schemas between main/renderer |
| Terminal emulation | **xterm.js** + **node-pty** | Industry standard; xterm.js 5.x |
| Monorepo | **Turborepo** + **Bun** | Fast installs, task caching |
| Linting/Formatting | **Biome** | Replaces ESLint + Prettier, fast |
| Language | **TypeScript 5.x** (strict) | End-to-end type safety |

---

## 3. Monorepo Structure

```
supermuschel/
├── apps/
│   └── desktop/                   # The Electron app
│       ├── electron/              # Main process
│       │   ├── main.ts            # App entry, BrowserWindow setup
│       │   ├── preload.ts         # Context bridge (minimal surface)
│       │   ├── ipc/               # tRPC router + procedure definitions
│       │   │   ├── router.ts
│       │   │   ├── workspace.ts   # Workspace CRUD, agent start/stop
│       │   │   ├── sandbox.ts     # Sandbox config + status
│       │   │   └── agent-ui.ts    # set-status, set-progress, trigger-flash
│       │   ├── sandbox/           # Sandbox engine (delegates to @supermuschel/sandbox)
│       │   ├── agents/            # Agent process manager
│       │   │   ├── claude.ts
│       │   │   └── opencode.ts
│       │   └── socket/            # Unix domain socket (for supermuschel CLI)
│       └── src/                   # Renderer (Vite + React)
│           ├── components/
│           │   ├── layout/        # AppShell, Sidebar, MainPane, ContextPanel
│           │   ├── terminal/      # TerminalPane (xterm.js wrapper)
│           │   ├── workspace/     # WorkspaceCard, SidebarEntry
│           │   └── sandbox/       # SandboxSelector, SandboxBadge
│           ├── pages/
│           │   ├── index.tsx      # Main workspace view
│           │   └── settings.tsx   # App-level settings
│           ├── stores/            # Jotai/Zustand atoms
│           └── hooks/             # useWorkspace, useSandbox, useTRPC
├── packages/
│   ├── shared/                    # Shared Zod schemas + TypeScript types
│   ├── sandbox/                   # @supermuschel/sandbox — sandbox engine
│   │   ├── src/
│   │   │   ├── index.ts           # SandboxManager interface
│   │   │   ├── none.ts            # Level 0: passthrough
│   │   │   ├── seatbelt.ts        # Level 1: macOS sandbox-exec
│   │   │   └── container.ts       # Level 2: Docker/Podman via yolobox protocol
│   │   └── profiles/
│   │       └── seatbelt-default.sb # Default macOS Seatbelt profile template
│   └── agent-api/                 # @supermuschel/agent-api
│       ├── src/
│       │   ├── index.ts
│       │   ├── claude.ts          # Claude Code spawn + lifecycle
│       │   └── opencode.ts        # OpenCode spawn + lifecycle
├── tools/
│   └── supermuschel-cli/          # The `supermuschel` binary (agents call this)
│       ├── src/
│       │   └── main.ts            # CLI: set-status, set-progress, trigger-flash, notify
│       └── README.md
├── turbo.json
├── package.json                   # Root workspace config (Bun)
├── biome.json
└── tsconfig.base.json
```

---

## 4. Design System

### Color Palette

**Adaptive to macOS System Preferences** (prefers-color-scheme).

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--bg-base` | `#0e1117` | `#f9fafb` | App background |
| `--bg-sidebar` | `#13181f` | `#f1f3f6` | Left sidebar |
| `--bg-surface` | `#181d26` | `#ffffff` | Terminal panes, cards |
| `--bg-hover` | `#1f2736` | `#eef0f4` | Hover states |
| `--accent` | `#6366f1` | `#6366f1` | Primary CTA, focus rings |
| `--accent-subtle` | `#6366f115` | `#6366f112` | Subtle accent backgrounds |
| `--text-primary` | `#f0f4ff` | `#111827` | Body text |
| `--text-muted` | `#6b7280` | `#6b7280` | Labels, metadata |
| `--border` | `#252d3d` | `#e5e7eb` | Dividers, card borders |
| `--sandbox-none` | `#6b7280` | `#9ca3af` | Sandbox badge: off |
| `--sandbox-os` | `#22c55e` | `#16a34a` | Sandbox badge: Seatbelt |
| `--sandbox-container` | `#3b82f6` | `#2563eb` | Sandbox badge: Container |
| `--flash-border` | `#6366f1` | `#6366f1` | trigger-flash animation |

**Typography**: `Inter` from Google Fonts (same weight as the Notion/Linear design language). Monospace: `JetBrains Mono` for terminals.

### Layout (3-column shell)

```
┌──────────────────────────────────────────────────────────────────┐
│ ░░  supermuschel                              ⊞ New  ⌘,  ─ □ ×  │  ← macOS titlebar (traffic lights)
├──────────────┬───────────────────────────────────────────────────┤
│              │                                                    │
│  SIDEBAR     │   MAIN PANE                                        │
│  (220px)     │   Terminal fills this area                         │
│              │                                                    │
│  ● Workspace │   ╔══════════════════════════════════════════════╗ │
│    name      │   ║  xterm.js terminal                          ║ │
│    branch    │   ║  (node-pty → sandboxed agent process)        ║ │
│    [████ ]   │   ║                                              ║ │
│    75% done  │   ║                                              ║ │
│    ✓ tests   │   ╚══════════════════════════════════════════════╝ │
│              │                                                    │
│  + New       │   SANDBOX: [🔒 OS Sandbox ▾]  AGENT: [Claude ▾]  │
│              │                                                    │
└──────────────┴───────────────────────────────────────────────────┘
```

**Phase 1 has only a single workspace pane** (no worktree splitting). The sidebar will be designed to accommodate multiple workspaces in Phase 2 without layout changes.

---

## 5. Core Components

### 5.1 Agent Process Manager (`packages/agent-api`)

Manages the lifecycle of Claude Code and OpenCode as child processes.

```typescript
interface AgentProcess {
  id: string;
  type: 'claude' | 'opencode';
  pid: number;
  status: 'starting' | 'running' | 'stopped' | 'crashed';
  pty: IPty;          // node-pty pseudo-terminal
}

// Start an agent wrapped by the sandbox
AgentManager.start({
  type: 'claude',
  cwd: '/Users/user/project',
  sandbox: workspace.sandboxConfig,
})
```

**Claude Code**: Spawned as `claude` (or `claude --dangerously-skip-permissions` in sandboxed mode — the sandbox is the safety boundary). Detects installation via `which claude`.

**OpenCode**: Spawned as `opencode` (SST CLI). Detects installation via `which opencode`.

Both emit PTY output that is piped to xterm.js in the renderer via a tRPC subscription stream.

### 5.2 Sandbox Engine (`packages/sandbox`)

Unified interface with pluggable backends:

```typescript
interface SandboxBackend {
  level: 0 | 1 | 2;
  name: string;
  available(): Promise<boolean>;   // check prereqs
  wrapSpawn(cmd: string, args: string[], opts: SpawnOptions): SpawnOptions;
}
```

#### Level 0 — None
Passthrough. `wrapSpawn` returns opts unchanged.

#### Level 1 — macOS Seatbelt (default)

Generates a `sandbox-exec` profile from a template and writes it to a temp file. Profile structure:

```scheme
(version 1)
(deny default)

; Allowed paths (project directory)
(allow file-read* file-write* (subpath "/Users/user/project"))

; Allow read of common tool paths
(allow file-read* (subpath "/usr"))
(allow file-read* (subpath "/opt/homebrew"))
(allow file-read* (subpath "/nix"))

; Deny home directory (except $HOME/.claude for Claude auth)
(deny file-read* file-write* (subpath "/Users/user")
  (with message "home directory is protected by supermuschel sandbox"))
(allow file-read* (subpath "/Users/user/.claude"))
(allow file-read* (literal "/Users/user/.config"))

; Network: allow by default, configurable
(allow network*)

; Process
(allow process-exec)
(allow process-fork)
```

`wrapSpawn` transforms: `claude ...` → `sandbox-exec -f /tmp/sm-<id>.sb claude ...`

**Availability check**: `which sandbox-exec && sw_vers` (macOS only).

**Deprecation handling**: On macOS 26+ (future), detect if `sandbox-exec` is unavailable and fall back to container mode automatically, with a macOS notification explaining the switch.

#### Level 2 — Container (yolobox / Podman rootless)

```typescript
// Availability check
async available(): Promise<boolean> {
  return (await which('podman') || await which('docker')) !== null;
}

// wrapSpawn: delegate to yolobox CLI if installed, else build equivalent docker run
wrapSpawn(cmd, args, opts) {
  if (yoloboxAvailable) {
    return { cmd: 'yolobox', args: [cmd, ...args], ... };
  }
  // Build equivalent: docker run --rm -it -v project:project --workdir project image cmd args
  return buildDockerRun(cmd, args, opts);
}
```

Prefers Podman over Docker (rootless Podman = safer). Detects which runtime is available.

### 5.3 Agent-Writable UI API

This is what makes the sidebar live. Inspired by cmux.

**Architecture:**

```
Agent (running in PTY)
  │ calls supermuschel CLI
  ▼
tools/supermuschel-cli/main.ts
  │ serializes to JSON
  │ writes to Unix socket: /tmp/supermuschel-<workspaceId>.sock
  ▼
Electron main process socket server
  │ parses JSON
  │ dispatches tRPC event
  ▼
Renderer (React)
  │ tRPC subscription
  ▼
Sidebar updates in real-time
```

**CLI commands agents can call:**

```bash
supermuschel set-status <key> <value> [--icon <sf-symbol>]
# Example: supermuschel set-status branch "feat/auth" --icon "arrow.triangle.branch"

supermuschel set-progress <0.0-1.0>
# Example: supermuschel set-progress 0.75    → shows 75% bar in sidebar

supermuschel notify --title <title> --body <body>
# Sends macOS system notification via Electron's Notification API

supermuschel trigger-flash
# Pulses the workspace border with --accent color for 3 animation frames
```

The CLI is compiled as a tiny binary (Bun build, ~1MB) and is auto-installed into `$PATH` when the user first launches the app. It's auto-injected into the PATH visible to sandboxed agents so they can call it regardless of sandbox level.

> **Note**: In Seatbelt mode, the Unix socket is in `/tmp/` which is allowed by the profile. No special config required.

### 5.4 Workspace Data Model (SQLite via Drizzle)

```typescript
// packages/shared/src/schema.ts
export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  projectPath: text('project_path').notNull(),
  agentType: text('agent_type', { enum: ['claude', 'opencode'] }).notNull(),
  sandboxLevel: integer('sandbox_level').default(1), // 0=none, 1=seatbelt, 2=container
  sandboxConfig: text('sandbox_config', { mode: 'json' }), // per-level config JSON
  statusBadges: text('status_badges', { mode: 'json' }), // { key: { value, icon } }
  progress: real('progress'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});
```

---

## 6. Key Screens (Phase 1)

### Screen 1: Empty State / New Workspace
- Centered card: "Open a project" → directory picker
- Choose agent (Claude / OpenCode)
- Choose sandbox level (with explanation of each)
- "Start agent" → transitions to workspace view

### Screen 2: Workspace View (primary)
- Sidebar entry: workspace name, status badges (live), progress bar
- Main pane: full-height xterm.js terminal
- Status bar at bottom: sandbox indicator pill (color-coded), agent type, connected/disconnected
- Top-right: sandbox settings gear icon

### Screen 3: Sandbox Settings (slide-over drawer)
- Toggle between levels with visual explanation
- Level 1: shows the sandbox profile paths (editable list of allowed/denied paths)
- Level 2: shows container runtime status, image info
- "Apply" restarts the agent with new sandbox

### Screen 4: App Settings (⌘,)
- Agent paths (auto-detected, overridable)
- Theme (System / Dark / Light)
- Default sandbox level
- Auto-update settings

---

## 7. Milestone Plan

### M1 — Scaffold (Week 1)
- [ ] Turborepo + Bun monorepo initialization
- [ ] `apps/desktop` with electron-vite + React 19 + Tailwind v4 + TanStack Router
- [ ] electron-trpc setup with sample procedure
- [ ] Biome linting, tsconfig shared
- [ ] Basic 3-column shell with design tokens (dark + light adaptive)
- [ ] SQLite + Drizzle migrations

### M2 — Sandbox Engine (Week 2)
- [ ] `packages/sandbox` — Level 0 (none) + Level 1 (Seatbelt)
- [ ] Auto-detection of macOS version / `sandbox-exec` availability
- [ ] Seatbelt profile template with variable interpolation (project path, home)
- [ ] Level 2 (Container) — Docker/Podman detection + spawn wrapping
- [ ] tRPC procedures: `sandbox.getStatus`, `sandbox.setLevel`, `sandbox.testIsolation`
- [ ] Sandbox selector UI in workspace view

### M3 — Terminal + Agents (Week 3)
- [ ] `packages/agent-api` — Claude Code spawn (bare + sandboxed)
- [ ] OpenCode spawn (bare + sandboxed)
- [ ] node-pty integration + xterm.js renderer
- [ ] tRPC streaming: `agent.output` subscription (PTY → renderer)
- [ ] tRPC: `agent.input` (renderer → PTY stdin)
- [ ] Agent detection (which claude, which opencode) + setup guidance if missing

### M4 — Agent-Writable UI (Week 4)
- [ ] `tools/supermuschel-cli` — CLI binary (Bun build)
- [ ] Unix socket server in Electron main process
- [ ] Implement: `set-status`, `set-progress`, `notify`, `trigger-flash`
- [ ] tRPC event subscription: live sidebar badge updates
- [ ] Sidebar status badge rendering (key/value + SF Symbol icon)
- [ ] Progress bar animation in sidebar
- [ ] Visual flash animation (border pulse on workspace card)
- [ ] Auto-inject `supermuschel` binary into agent PATH
- [ ] macOS notification integration (`Notification` API)

### M5 — Polish & Release (Week 5)
- [ ] Empty state & onboarding flow ("Add project → pick agent → pick sandbox")
- [ ] Error states (agent crashed, sandbox unavailable, missing dependencies)
- [ ] App settings screen (⌘,)
- [ ] macOS menu bar integration (File, Edit, Window menus)
- [ ] `.dmg` packaging via `electron-builder`
- [ ] Auto-update (`electron-updater`)
- [ ] README + one-line install (`brew install --cask supermuschel`)
- [ ] Sandbox deprecation warning if `sandbox-exec` unavailable

---

## 8. Security Notes

- **Seatbelt profile** is written to `/tmp/sm-<uuid>.sb` and deleted on agent stop — never persisted to project directory
- **Unix socket** is `0600` (only owner readable) — prevents other users or malicious processes from injecting commands
- **Agent `--dangerously-skip-permissions`** flag is only passed to Claude Code when a sandbox of Level ≥ 1 is active — never in Level 0 unsafe mode
- The **"yolo mode"** marketing only appears when sandbox Level ≥ 1 is selected

---

## 9. Dependencies to Validate Before Build

| Dependency | Check |
|---|---|
| `electron-trpc` | Confirm active maintenance, compatible with Electron 40+ |
| `electron-vite` | Latest version + React 19 template |
| `xterm.js` | Version 5.x; confirm WebGL renderer works in Electron |
| `node-pty` | Prebuilt binaries for Electron version (electron-rebuild) |
| `better-sqlite3` | Same — needs Electron native rebuild |
| `sandbox-exec` | Confirm available on macOS Sequoia (15.x); test on macOS Sonoma (14.x) |
| `yolobox` | Homebrew tap works; interop test |
| `opencode` CLI | SST team releases; install path detection |
