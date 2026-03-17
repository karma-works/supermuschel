# Superset — Project Overview

> Source of analysis: [superset-sh/superset](https://github.com/superset-sh/superset) (Apache 2.0)  
> Clone goal: Rebuild under **MIT license**

---

## What is Superset?

Superset is a **macOS desktop application** — a turbocharged terminal / IDE designed for the **AI Agents Era**.  
It lets developers run multiple CLI-based AI coding agents (Claude Code, OpenAI Codex, Cursor Agent, Gemini CLI, etc.) simultaneously, each isolated in its own **git worktree**.

Official tagline: *"The Terminal for Coding Agents"*

---

## Core Value Propositions

| Feature | Description |
|---|---|
| **Parallel agent execution** | Run many agents at the same time without context-switching overhead |
| **Git worktree isolation** | Each task/branch gets its own working directory — agents don't interfere |
| **Centralized monitoring** | Watch all agents from one place; get notified when they need input |
| **Diff viewer & editor** | Built-in UI to review, stage, commit, and push changes |
| **Built-in terminal** | Persistent terminal sessions per workspace |
| **IDE integration** | Open any workspace in Cursor or VS Code |
| **In-app browser** | Preview ports/services running in each workspace |
| **MCP Server** | Model Context Protocol server for deep agent integration |
| **Custom themes** | Fully customizable appearance |

---

## Target Platform

- **macOS** (Apple Silicon + Intel)
- Windows / Linux listed as "coming soon"
- Distributed as a `.dmg` installer; also buildable from source

---

## Requirements (runtime, not build)

- Git
- [Bun](https://bun.sh/) (package manager & runtime)
- [GitHub CLI (`gh`)](https://cli.github.com/) — for GitHub authentication
- [Caddy](https://caddyserver.com/) — reverse proxy for ElectricSQL SSE streams

---

## License

Original: **Apache 2.0**  
This clone: **MIT**

---

## Links

- GitHub: https://github.com/superset-sh/superset
- Docs: https://docs.superset.sh
- Discord: https://discord.gg/cZeD9WYcV7
