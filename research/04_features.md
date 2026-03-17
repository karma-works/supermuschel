# Superset — Features & User-Facing Functionality

## Core Features

### 1. Workspaces

The central concept. Each workspace represents **one branch of a repository**, checked out into its own directory via a **git worktree**.

- Add any local folder or remote Git URL as a repository
- Create workspaces from specific branches
- Switch between workspaces instantly (no stashing needed)
- Each workspace has its own isolated directory and terminal state
- Workspaces can have **setup and teardown scripts** (`.superset/config.json`)

```json
// .superset/config.json
{
  "setup": ["./.superset/setup.sh"],
  "teardown": ["./.superset/teardown.sh"]
}
```

### 2. Terminal

- Built-in terminal emulator (xterm.js) per workspace
- Persistent sessions — reconnect to running processes
- Multiple terminal panes per workspace
- Terminal presets (save common commands)
- Supports ligatures, images inline (iTerm protocol), clipboard, search

#### Keyboard shortcuts
| Shortcut | Action |
|---|---|
| `⌘T` | New terminal |
| `⌘W` | Close terminal |
| `⌘D` | Split terminal |
| `⌘⇧D` | Split terminal vertically |
| `⌘K` | Clear terminal |
| `⌘F` | Search in terminal |
| `⌘⌥←/→` | Switch terminal pane |
| `Ctrl+1-9` | Switch to terminal N |

### 3. AI Agents

- Spawn any CLI-based coding agent (Claude Code, Codex, Cursor Agent, Gemini CLI, Copilot, OpenCode) inside a workspace terminal
- Agent runs isolated in its own worktree
- Chat interface for interacting with agents
- **Inline prompts** — send prompts directly from the UI
- Agent monitoring — get notified when an agent needs attention
- **Parallel agents** — multiple agents across multiple workspaces
- Sandbox access for secure agent execution

#### Supported integrations
- Claude Code (Anthropic)
- OpenAI Codex CLI
- Cursor Agent
- Gemini CLI
- GitHub Copilot
- OpenCode

### 4. Diff Viewer

- Visual diff of changes in each workspace
- Stage/unstage files
- Commit changes with a message
- Push to remote
- Powered by CodeMirror 6 and `@pierre/diffs`

### 5. In-App Browser

- Preview services running on local ports within the app
- Per-workspace port management
- View running apps without leaving Superset

### 6. IDE Integration

- Open any workspace directly in Cursor or VS Code
- Deep IDE integration — no context switching

### 7. MCP Server

- Exposes a **Model Context Protocol** (MCP) server
- Allows AI agents to interact with Superset itself:
  - Read workspace state
  - Create/switch workspaces
  - Monitor terminal sessions

### 8. Layout Management

- Tiling window manager (react-mosaic-component)
- Resizable panels
- Customizable keyboard shortcuts

#### Layout shortcuts
| Shortcut | Action |
|---|---|
| `⌘B` | Toggle sidebar |
| `⌘L` | Toggle layout |
| `⌘O` | Toggle panel |
| `⌘⇧C` | Toggle chat |

### 9. Workspace Navigation

| Shortcut | Action |
|---|---|
| `⌘1-9` | Switch to workspace N |
| `⌘⌥↑/↓` | Navigate workspaces |
| `⌘N` | New workspace |
| `⌘⇧N` | New repository |
| `⌘⇧O` | Open workspace |

### 10. Custom Themes

- Fully customizable appearance
- Theme configuration via Settings
- Custom CSS/color support

### 11. Monorepo Support

- Works with monorepos
- Understands workspaces within a repo

### 12. Authentication & Accounts

- User accounts (sign in required for cloud features)
- OAuth-based authentication (better-auth)
- Stripe-based billing / subscription management

### 13. Cloud Sync

- Settings and workspace metadata sync via ElectricSQL (real-time PostgreSQL sync)
- Works offline; syncs when connected

### 14. Observability

- Error reporting via Sentry
- Product analytics via PostHog

---

## Configuration

- Keyboard shortcuts fully configurable via **Settings → Keyboard Shortcuts** (`⌘/`)
- Theme customisation via **Settings → Themes**
- Agent presets (terminal presets)
- Setup/teardown scripts per repository (`.superset/config.json`)

---

## External Integrations (via API)

| Service | Purpose |
|---|---|
| GitHub (Octokit) | Repository access, webhooks, PR management |
| Slack | Notifications |
| Linear | Issue tracking |
| Stripe | Billing |
| Tavily | AI-powered web search |
| Upstash | Rate limiting, background jobs |
| Vercel Blob | File storage |
| PostHog | Analytics |
| Sentry | Error monitoring |
