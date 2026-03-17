# Superset Clone — Implementation Strategy (MIT Edition)

This document outlines the recommended approach for building an open MIT-licensed clone of [superset-sh/superset](https://github.com/superset-sh/superset).

---

## Scope

The original Superset is a **desktop application** for managing AI coding agents via git worktrees. The clone should replicate its **core functionality** without any proprietary dependencies or Apache 2.0 licensed code.

---

## What to Clone vs What to Replace

| Aspect | Original | MIT Clone Approach |
|---|---|---|
| **License** | Apache 2.0 | MIT ✅ (write from scratch) |
| **Runtime** | Bun | Bun (MIT) ✅ |
| **Monorepo** | Turborepo | Turborepo (MIT) ✅ |
| **Desktop shell** | Electron | Electron (MIT) ✅ |
| **Build** | electron-vite + Vite | Same stack ✅ |
| **UI framework** | React 19 | React 19 (MIT) ✅ |
| **Styling** | Tailwind CSS v4 | Same ✅ |
| **Terminal** | xterm.js | xterm.js (MIT) ✅ |
| **Editor** | CodeMirror 6 | CodeMirror 6 (MIT) ✅ |
| **Rich text** | TipTap | TipTap (MIT) ✅ |
| **Routing** | TanStack Router | TanStack Router (MIT) ✅ |
| **State** | Zustand, TanStack Query | Same ✅ |
| **IPC** | tRPC + trpc-electron | Same (MIT) ✅ |
| **Validation** | Zod | Zod (MIT) ✅ |
| **Git** | simple-git | simple-git (MIT) ✅ |
| **Local DB** | Drizzle + SQLite | Same (MIT) ✅ |
| **Auth** | better-auth | better-auth (MIT) ✅ |
| **Linter** | Biome | Biome (MIT) ✅ |
| **Cloud sync** | ElectricSQL | ElectricSQL (Apache 2.0) ⚠️ — evaluate or replace |
| **Agent AI** | Mastra (forked) | Use official Mastra (Apache 2.0) or write own ⚠️ |
| **Analytics** | PostHog | PostHog (MIT) ✅ or omit |
| **Errors** | Sentry | Sentry SDK (MIT) ✅ or omit |
| **Payments** | Stripe | Stripe SDK (MIT) ✅ |
| **Cloud DB** | Drizzle (Turso/PG) | Same — use Turso (MIT client) ✅ |
| **Proxy** | Caddy | Caddy (Apache 2.0) ⚠️ — evaluate or use nginx |

> **Note**: Apache 2.0 is generally **compatible** with building a separate MIT-licensed product that uses those libraries as dependencies. The key concern is **copying source code** directly from Apache 2.0 projects — that would require keeping the Apache 2.0 attribution for those files. Building a clean-room implementation avoids this issue entirely.

---

## Recommended Build Order (MVP-First)

### Phase 1: Monorepo Skeleton
- [ ] Initialize Bun + Turborepo monorepo
- [ ] Set up `tooling/typescript` shared tsconfig
- [ ] Set up Biome for linting/formatting
- [ ] Create `apps/desktop` skeleton with electron-vite

### Phase 2: Desktop Shell
- [ ] Electron main process setup
- [ ] Renderer with React 19 + TanStack Router
- [ ] Tailwind CSS v4 design system
- [ ] tRPC over Electron IPC bridge
- [ ] Basic window/layout management (react-mosaic or custom)

### Phase 3: Git Worktree Management
- [ ] Add repository (local path or Git URL)
- [ ] Create workspace = `git worktree add`
- [ ] List / switch / delete workspaces
- [ ] `@superset/workspace-fs` equivalent package

### Phase 4: Terminal Integration
- [ ] Embed xterm.js in renderer
- [ ] Spawn node-pty in main process
- [ ] Route terminal I/O via tRPC IPC
- [ ] Persistent sessions per workspace

### Phase 5: Diff Viewer
- [ ] CodeMirror 6 unified/split diff view
- [ ] Stage/unstage with simple-git
- [ ] Commit + push UI

### Phase 6: AI Agent Support
- [ ] Spawn any CLI agent in a workspace terminal
- [ ] Chat UI (TipTap editor + streaming markdown)
- [ ] Vercel AI SDK for streaming completions
- [ ] Agent monitoring / notification system

### Phase 7: Local Data Layer
- [ ] SQLite with Drizzle ORM (local state)
- [ ] Workspace settings persistence
- [ ] Session management

### Phase 8: Auth & Cloud (optional MVP)
- [ ] better-auth (OAuth with GitHub)
- [ ] Cloud DB sync (Turso / ElectricSQL)
- [ ] User preferences sync

### Phase 9: Polish & Distribution
- [ ] electron-builder macOS packaging (.dmg)
- [ ] Auto-updater (electron-updater)
- [ ] MCP server
- [ ] Setup/teardown scripts
- [ ] Custom themes
- [ ] Keyboard shortcut customization

---

## Key Architectural Decisions

### 1. Cloud Sync Strategy

ElectricSQL provides real-time PostgreSQL sync. For the MIT clone:
- **Option A**: Keep ElectricSQL (Apache 2.0 — compatible as dependency)
- **Option B**: Use [Turso](https://turso.tech/) libSQL with periodic sync
- **Option C**: Local-only for MVP; add sync later

**Recommendation**: Start local-only (Phase 7), evaluate sync in Phase 8.

### 2. AI Agent Framework

Original uses a **forked Mastra** (`mastracode`) for agent orchestration.

Options:
- **Option A**: Use official Mastra (Apache 2.0 dependency — fine)
- **Option B**: Use Vercel AI SDK directly (simpler, MIT)
- **Option C**: Write a lightweight agent pipeline (most control)

**Recommendation**: Start with Vercel AI SDK (Phase 6), optionally adopt Mastra later.

### 3. Reverse Proxy

Caddy is Apache 2.0. For pure MIT:
- Use `nginx` (BSD-2) or `http-proxy` npm package (MIT) instead
- Or: skip HTTP/2 multiplexing for now (only needed at scale with 10+ streams)

### 4. Native macOS Metrics

Original has a Swift/N-API addon for process metrics.

Options:
- Use `pidusage` (MIT) — cross-platform, good enough for MVP
- Build a Swift native addon later if needed

---

## Package Naming Convention

Following the original's pattern:

```
@supermuschel/desktop    # Electron app
@supermuschel/api        # Next.js API (if needed)
@supermuschel/web        # Web frontend (if needed)
@supermuschel/shared     # Shared types/utils
@supermuschel/trpc       # tRPC router definitions
@supermuschel/ui         # Shared UI components
@supermuschel/db         # DB schema (Drizzle)
@supermuschel/local-db   # Local SQLite schema
@supermuschel/auth       # Auth helpers
@supermuschel/workspace-fs # Workspace FS abstraction
@supermuschel/agent      # AI agent management
@supermuschel/mcp        # MCP server
```

---

## Minimum Dependencies for MVP

```json
{
  "runtime": "bun@1.3.6",
  "monorepo": "turbo",
  "desktop": "electron@40, electron-vite, electron-builder",
  "ui": "react@19, @tanstack/react-router, zustand, tailwindcss@4",
  "terminal": "@xterm/xterm, node-pty",
  "editor": "@codemirror/*, @pierre/diffs",
  "ipc": "@trpc/server, @trpc/client, trpc-electron, superjson, zod",
  "git": "simple-git",
  "db": "drizzle-orm, better-sqlite3",
  "ai": "ai (vercel), @ai-sdk/anthropic, @ai-sdk/openai",
  "animation": "framer-motion",
  "lint": "@biomejs/biome"
}
```
