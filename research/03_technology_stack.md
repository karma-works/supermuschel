# Superset — Technology Stack

## Language Breakdown

| Language | Usage (%) |
|---|---|
| TypeScript | 94.8% |
| MDX | 3.3% |
| Shell | 1.1% |
| CSS | 0.5% |
| JavaScript | 0.2% |
| Swift | 0.1% |

---

## Runtime & Tooling

| Tool | Version | Role |
|---|---|---|
| [Bun](https://bun.sh/) | 1.3.6 | Package manager, runtime, test runner |
| [Turborepo](https://turbo.build/repo) | ^2.8.7 | Monorepo task orchestration + caching |
| [TypeScript](https://www.typescriptlang.org/) | ^5.9.3 | Primary language |
| [Biome](https://biomejs.dev/) | 2.4.2 | Linter + formatter (replaces ESLint/Prettier) |
| [Sherif](https://github.com/QuiiBz/sherif) | ^1.10.0 | Monorepo-level lint rules |
| [Caddy](https://caddyserver.com/) | latest | Reverse proxy for ElectricSQL SSE streams |

---

## Desktop App (`apps/desktop`)

### Framework & Build

| Library | Version | Role |
|---|---|---|
| [Electron](https://www.electronjs.org/) | 40.2.1 | Desktop app shell |
| [electron-vite](https://electron-vite.org/) | ^4.0.0 | Vite-based build tool for Electron |
| [electron-builder](https://www.electron.build/) | ^26.4.0 | Packaging & code signing for macOS |
| [Vite](https://vitejs.dev/) | ^7.1.3 | Renderer bundler |
| [Tailwind CSS](https://tailwindcss.com/) | ^4.1.18 | Utility-first CSS framework |

### UI & React

| Library | Version | Role |
|---|---|---|
| [React](https://react.dev/) | 19.2.0 | UI framework |
| [TanStack Router](https://tanstack.com/router) | ^1.147.3 | File-based client-side routing |
| [TanStack Query](https://tanstack.com/query) | ^5.90.19 | Server-state data fetching |
| [TanStack Table](https://tanstack.com/table) | ^8.21.3 | Headless table |
| [TanStack Virtual](https://tanstack.com/virtual) | ^3.13.18 | Virtualised lists |
| [Framer Motion](https://www.framer.com/motion/) | ^12.23.26 | Animations |
| [Radix UI](https://www.radix-ui.com/) | ^1.x | Headless accessible components |
| [Lucide React](https://lucide.dev/) | ^0.563.0 | Icon set |
| [Zustand](https://zustand-demo.pmnd.rs/) | ^5.0.8 | Global client state management |
| [react-mosaic-component](https://github.com/nomcopter/react-mosaic) | ^6.1.1 | Tiling window manager layout |
| [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels) | ^3.0.6 | Resizable panel layouts |
| [dnd-kit](https://dndkit.com/) | ^6.x | Drag-and-drop interactions |

### Terminal

| Library | Version | Role |
|---|---|---|
| [xterm.js / @xterm](https://xtermjs.org/) | 6.1.0-beta.195 | Terminal emulator (renderer) |
| xterm addons | various | WebGL, images, clipboard, search, ligatures |
| [node-pty](https://github.com/microsoft/node-pty) | 1.1.0 | Pseudo-terminal (main process) |

### Code Editor & Diff

| Library | Version | Role |
|---|---|---|
| [CodeMirror 6](https://codemirror.net/6/) | ^6.x | Code editor (diff viewer + file editor) |
| CodeMirror lang-* | ^6.x | Language support: JS, TS, Python, Rust, Go, etc. |
| [@pierre/diffs](https://github.com/nicholasgasior/pierre) | ^1.0.10 | Diff computation |

### Rich Text / Chat

| Library | Version | Role |
|---|---|---|
| [TipTap](https://tiptap.dev/) | ^3.17.1 | Rich text editor (chat input) |
| [react-markdown](https://github.com/remarkjs/react-markdown) | ^10.1.0 | Markdown rendering |
| [streamdown](https://github.com/nicolo-ribaudo/streamdown) | ^2.2.0 | Streaming markdown renderer |
| remark-gfm, rehype-* | ^4/6/7 | Markdown + HTML processing pipeline |

### Data & Storage

| Library | Version | Role |
|---|---|---|
| [Drizzle ORM](https://orm.drizzle.team/) | 0.45.1 | SQLite ORM + migrations |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | 12.6.2 | SQLite driver (main process) |
| [libsql](https://turso.tech/libsql) | 0.5.22 | Turso SQLite driver |
| [TanStack DB](https://tanstack.com/db) | 0.5.31 | Reactive local DB collections |
| [@tanstack/electric-db-collection](https://tanstack.com/) | 0.2.39 | ElectricSQL ↔ TanStack DB bridge |
| [@electric-sql/client](https://electric-sql.com/) | 1.5.12 | Real-time Postgres sync (SSE) |
| [@durable-streams/client](https://github.com/) | ^0.2.1 | Durable event streaming client |
| [idb / idb-keyval](https://github.com/jakearchibald/idb) | ^8/6 | IndexedDB helpers (renderer) |
| [lowdb](https://github.com/typicode/lowdb) | ^7.0.1 | JSON file-based local storage |

### IPC (Inter-Process Communication)

| Library | Version | Role |
|---|---|---|
| [tRPC](https://trpc.io/) | ^11.7.1 | Type-safe API / IPC |
| [trpc-electron](https://github.com/nicholasgasior/trpc-electron) | ^0.1.2 | tRPC transport for Electron IPC |
| [superjson](https://github.com/blitz-js/superjson) | ^2.2.5 | JSON serialization for tRPC (dates, etc.) |
| [Zod](https://zod.dev/) | ^4.3.5 | Schema validation (tRPC input types) |

### AI & Agents

| Library | Version | Role |
|---|---|---|
| [Vercel AI SDK (`ai`)](https://sdk.vercel.ai/) | ^6.0.0 | AI provider abstraction |
| [@ai-sdk/anthropic](https://sdk.vercel.ai/providers/anthropic) | ^3.0.43 | Anthropic provider |
| [@ai-sdk/openai](https://sdk.vercel.ai/providers/openai) | 3.0.36 | OpenAI provider |
| [@ai-sdk/react](https://sdk.vercel.ai/docs/ai-sdk-ui) | ^3.0.0 | React hooks for AI streams |
| [Mastra](https://mastra.ai/) | ^0.4.0 (forked) | AI agent orchestration framework |
| [@mastra/core + @mastra/memory](https://mastra.ai/) | forked | Core Mastra with custom memory |
| [mastracode](https://github.com/superset-sh/mastra) | ^0.4.0 (fork) | Forked Mastra for agent code execution |
| [@modelcontextprotocol/sdk](https://modelcontextprotocol.io/) (via api) | ^1.26.0 | MCP server/client SDK |
| [@outlit/browser + @outlit/node](https://outlit.dev/) | ^1.4.3 | (Likely used for live preview / browser integration) |

### Filesystem & Git

| Library | Version | Role |
|---|---|---|
| [simple-git](https://github.com/steveukzx/simple-git) | ^3.30.0 | Git operations (worktrees, diff, commit) |
| [@parcel/watcher](https://github.com/parcel-bundler/watcher) | ^2.5.6 | Native filesystem watching |
| [fast-glob](https://github.com/mrmlnc/fast-glob) | ^3.3.3 | File glob matching |
| [execa](https://github.com/sindresorhus/execa) | ^9.6.0 | Child process spawning |
| [@ast-grep/napi](https://ast-grep.github.io/) | ^0.41.0 | AST-based code search/transform |

### Auth

| Library | Version | Role |
|---|---|---|
| [better-auth](https://www.better-auth.com/) | 1.4.18 | Authentication (OAuth, sessions) |
| [@better-auth/stripe](https://www.better-auth.com/) | 1.4.18 | Stripe billing plugin |
| [jose](https://github.com/panva/jose) | ^6.1.3 | JWT / JWK signing & verification |

### Observability

| Library | Version | Role |
|---|---|---|
| [@sentry/electron](https://sentry.io/) | ^7.7.0 | Error tracking |
| [posthog-js / posthog-node](https://posthog.com/) | 1.310.1 / ^5.24.7 | Product analytics |

---

## API (`apps/api`)

| Library | Version | Role |
|---|---|---|
| [Next.js](https://nextjs.org/) | ^16.0.10 | Full-stack React framework |
| [Drizzle ORM](https://orm.drizzle.team/) | 0.45.1 | Database ORM |
| [tRPC](https://trpc.io/) | ^11.7.1 | Type-safe API |
| [better-auth](https://www.better-auth.com/) | 1.4.18 | Authentication |
| [Stripe](https://stripe.com/) | ^20.2.0 | Payment processing |
| [Upstash Redis](https://upstash.com/) | ^1.34.3 | Rate limiting, caching |
| [Upstash QStash](https://upstash.com/) | ^2.8.4 | Background job queuing |
| [Upstash Ratelimit](https://upstash.com/) | ^2.0.4 | Rate limiting middleware |
| [Vercel Blob](https://vercel.com/storage/blob) | ^2.0.0 | File/blob storage |
| [Octokit](https://github.com/octokit/octokit.js) | ^16/22 | GitHub App + REST API + Webhooks |
| [Slack Web API](https://api.slack.com/) | ^7.13.0 | Slack notifications |
| [Linear SDK](https://developers.linear.app/) | ^68.1.0 | Linear issue tracking integration |
| [Tavily](https://tavily.com/) | ^0.7.1 | AI-powered web search |
| [Anthropic SDK](https://www.anthropic.com/) | ^0.78.0 | AI completions |
| [MCP SDK](https://modelcontextprotocol.io/) | ^1.26.0 | Model Context Protocol |

---

## Web (`apps/web`)

Subset of API dependencies + Next.js frontend:
- Tailwind CSS v4, next-themes, Geist font, Framer Motion

---

## Docs (`apps/docs`)

- [Fumadocs](https://fumadocs.vercel.app/) — MDX-powered documentation framework on Next.js
- Content authored in `.mdx` files

---

## Native / Platform

- `@superset/macos-process-metrics` — native **Node.js addon** (N-API) for macOS process CPU/RAM monitoring
- **Swift** (~0.1%) — likely for macOS-specific native extensions
