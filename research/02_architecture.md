# Superset — Architecture

## High-Level Architecture

Superset is a **Bun-powered monorepo** built with [Turborepo](https://turbo.build/repo) for task orchestration.

```
supermuschel/
├── apps/
│   ├── admin/            # Internal admin dashboard
│   ├── api/              # Backend API (Next.js)
│   ├── desktop/          # Main Electron desktop app ← core product
│   ├── docs/             # Documentation site (Fumadocs MDX)
│   ├── electric-proxy/   # ElectricSQL proxy service
│   ├── marketing/        # Marketing website
│   ├── mobile/           # Mobile app (likely React Native)
│   ├── streams/          # Durable streams service
│   └── web/              # Web frontend (Next.js)
├── packages/             # Shared internal libraries
├── tooling/              # Shared build tooling (TS configs, etc.)
├── Caddyfile.example     # Reverse proxy config
├── turbo.json            # Turborepo pipeline
└── package.json          # Root monorepo config
```

---

## App Architecture

### `apps/desktop` — The Core Product

The desktop app is an **Electron** application using **electron-vite** for bundling. It follows the standard Electron process model:

```
Main Process (Node.js / Bun)
  ├── Git operations (simple-git)
  ├── Terminal management (node-pty)
  ├── tRPC server (IPC over trpc-electron)
  ├── Local SQLite DB (better-sqlite3 / libsql + Drizzle ORM)
  ├── Process monitoring (pidusage, pidtree)
  ├── File watching (@parcel/watcher)
  └── Hono HTTP server (for internal services)

Renderer Process (React 19)
  ├── TanStack Router (file-based routing)
  ├── tRPC client (type-safe IPC)
  ├── xterm.js (terminal emulator)
  ├── CodeMirror 6 (code/diff editor)
  ├── TipTap (rich text / chat editor)
  ├── ElectricSQL client (real-time sync)
  ├── TanStack DB + TanStack Query (reactive data layer)
  └── Zustand (global state management)
```

### `apps/api` — Backend API

- **Framework**: Next.js (v16) with App Router
- **API layer**: tRPC (type-safe RPC shared with desktop)
- **Auth**: better-auth with OAuth provider support
- **Database**: Drizzle ORM (cloud DB, likely PostgreSQL/Turso)
- **Payments**: Stripe
- **Rate limiting**: Upstash Redis + QStash (background jobs)
- **Storage**: Vercel Blob
- **GitHub integration**: Octokit (webhooks, REST, App)
- **Integrations**: Slack, Linear, Tavily (AI search), Anthropic AI SDK
- **MCP**: Model Context Protocol server

### `apps/web` — Web Frontend

- **Framework**: Next.js with App Router + React 19
- **Styling**: Tailwind CSS v4
- **State**: TanStack Query + tRPC
- **Auth**: better-auth (shared with API)
- **Analytics**: PostHog

### `apps/docs` — Documentation

- Built with **Fumadocs** (MDX-based docs framework on Next.js)
- Content written in MDX

---

## Shared Packages

| Package | Purpose |
|---|---|
| `@superset/agent` | AI agent runner / management logic |
| `@superset/auth` | Shared authentication helpers (better-auth) |
| `@superset/chat` | Chat UI components and logic |
| `@superset/chat-mastra` | Chat integration with Mastra AI framework |
| `@superset/db` | Shared cloud DB schema + migrations (Drizzle) |
| `@superset/desktop-mcp` | MCP server for the desktop app |
| `@superset/email` | Transactional email templates/sending |
| `@superset/host-service` | Service management for agent hosts |
| `@superset/local-db` | Local SQLite schema + migrations (Drizzle) |
| `@superset/macos-process-metrics` | Native macOS process metrics (Node addon) |
| `@superset/mcp` | Shared MCP (Model Context Protocol) utilities |
| `@superset/shared` | Common types, utilities, constants |
| `@superset/trpc` | Shared tRPC router definitions |
| `@superset/ui` | Shared React UI component library |
| `@superset/workspace-fs` | Workspace filesystem abstraction |

---

## Data Flow

```
User Action
    │
    ▼
React Renderer (TanStack Router + Zustand)
    │
    ▼ tRPC (IPC via trpc-electron)
    │
    ▼
Electron Main Process
    ├──▶ SQLite (local state, sessions, settings)
    ├──▶ node-pty (spawn agent terminal)
    ├──▶ simple-git (git worktree operations)
    └──▶ ElectricSQL client ──▶ Caddy ──▶ API (cloud sync)
```

---

## Networking & Sync

- **Local state**: SQLite via `better-sqlite3` / libsql
- **Cloud sync**: [ElectricSQL](https://electric-sql.com/) — real-time PostgreSQL sync over HTTP streams (SSE)
- **Caddy**: Required to proxy ElectricSQL streams over HTTP/2, avoiding browser's 6-connection limit when opening 10+ streams
- **tRPC**: End-to-end type-safe API used both for Electron IPC and HTTP (Next.js API routes)

---

## Build & Release

- Build tool: **electron-vite** (wraps Vite for Electron's multi-process build)
- Bundler: **Vite 7** (renderer), TSC/esbuild (main process)
- Packaging: **electron-builder** (outputs `.dmg` for macOS)
- Monorepo runner: **Turborepo** (caching + parallel tasks)
- Package manager: **Bun 1.3.6**
- Code quality: **Biome** (linter + formatter, replaces ESLint + Prettier)
- Type safety: **Sherif** (monorepo lint), strict TypeScript 5
