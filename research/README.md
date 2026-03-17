# Research Index

This folder documents the analysis of [superset-sh/superset](https://github.com/superset-sh/superset) as the basis for building **supermuschel** — an MIT-licensed clone.

## Documents

| File | Contents |
|---|---|
| [01_overview.md](./01_overview.md) | What Superset is, core value propositions, target platform, links |
| [02_architecture.md](./02_architecture.md) | Monorepo structure, app architecture, data flow, build & release |
| [03_technology_stack.md](./03_technology_stack.md) | Full dependency breakdown per app/package with versions and roles |
| [04_features.md](./04_features.md) | User-facing features, keyboard shortcuts, integrations |
| [05_clone_strategy.md](./05_clone_strategy.md) | MIT clone scope, what to reuse vs replace, build order, key decisions |

## Quick Summary

**Superset** is a macOS desktop app (Electron) that acts as a turbocharged terminal for running multiple AI coding agents (Claude Code, Codex, etc.) simultaneously, each isolated in its own git worktree.

**Tech stack at a glance:**
- Monorepo: Bun + Turborepo
- Desktop: Electron 40 + electron-vite + React 19 + TanStack Router
- Terminal: xterm.js + node-pty
- Editor: CodeMirror 6
- IPC: tRPC + trpc-electron
- DB: SQLite + Drizzle ORM (local), ElectricSQL (cloud sync)
- AI: Vercel AI SDK + Mastra (forked)
- Auth: better-auth
- Styling: Tailwind CSS v4
- Linting: Biome

**Original license**: Apache 2.0  
**Clone license**: MIT (clean-room reimplementation)
