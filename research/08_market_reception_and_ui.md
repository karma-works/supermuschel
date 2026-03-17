# Supermuschel — Market Reception, Popularity & UI Recommendation

---

## 1. Popularity & Reception Data

### GitHub Stars Comparison (as of March 2026)

| Tool | Stars | Signal |
|---|---|---|
| **Superset.sh** | **~7,300** ⭐ | Launched HN Dec 2025, Product Hunt 512 upvotes Mar 2026; fastest growing in category |
| **Conductor** | Unknown (closed-source) | r/conductorbuild subreddit exists; praised by Stripe/Notion engineers; "new Cursor" comparisons |
| **beads_viewer** | **~1,400** ⭐ | Solid for a niche tool; deeply praised by the agent-workflow community |
| **beads_rust** | **~737** ⭐ | Strong for a Rust CLI tool; growing with the beads ecosystem |
| **cass** | **~568** ⭐ | Well-received as immediately useful without complex setup |
| **frankentui** | **~217** ⭐ | Low stars, but high technical quality signals (already used to build cass) |
| **orch.one** | **~9** ⭐ | Just launched — enormous headroom if concept takes off |
| **cmux** | Not indexed on GitHub (closed-source) | Coverage on BetterStack, bitdoze, mejba.me — growing niche audience |

### HN & Community Reception

- **Superset** was the breakout hit: two "Show HN" threads (late 2025 and early 2026), both well-received with developers reporting "2-3x productivity" and replacing their existing IDE
- **Conductor** is frequently compared to Cursor — "the new Cursor" in r/ClaudeCode threads; dedicated subreddit
- **cmux** is praised for native performance and the agent-controllable UI API — the BetterStack deep-dive article shows growing coverage
- **Orch.one** is too new for community signal, but the concept of "24/7 daemon + agent teams" consistently appears in Reddit discussions as the #1 unsolved need in the category

---

## 2. Core Market Pain Points (User Research)

From Reddit, HN, and dev blog analysis, the top user frustrations in this category are:

| Pain Point | Frequency | Who Solves It |
|---|---|---|
| **Context decay** — agents forget previous decisions, instructions get lost | 🔥🔥🔥 | None fully; `cass` helps post-hoc |
| **Black-box opacity** — no visibility into what an agent is doing right now | 🔥🔥🔥 | cmux (status badges), Superset (terminal view) |
| **Agents die when you close the laptop** | 🔥🔥🔥 | Orch.one only |
| **No cross-agent memory** — can't find what past agents solved | 🔥🔥🔥 | `cass` only |
| **No task direction** — knowing *what* to work on next | 🔥🔥 | `bv` + orch.one |
| **Branch/port conflicts when running multiple agents** | 🔥🔥 | All tools use worktrees; port mgmt varies |
| **No review workflow** — changes ship without human check | 🔥🔥 | Conductor, orch.one |
| **macOS only** — no cross-platform option | 🔥 | Orch.one (CLI/daemon works everywhere) |
| **Electron overhead** — heavy RAM footprint when running many agents | 🔥 | cmux (native Swift); no Electron solution |
| **No headless/CI mode** | 🔥 | Orch.one only |

---

## 3. Core Features of the Market (Consensus Table)

These are the features that every serious tool in the category either has or is building:

| Feature | Superset | Conductor | cmux | Orch.one |
|---|---|---|---|---|
| Git worktree isolation | ✅ | ✅ | ❌ (DIY) | ✅ |
| Parallel terminal panes | ✅ | ✅ | ✅ | ✅ |
| Multi-agent monitoring | ✅ | ✅ | ✅ | ✅ (TUI) |
| Diff viewer / code review | ✅ | ✅ (strong) | ❌ | ❌ |
| In-app browser | ✅ | ❌ | ✅ (WebKit) | ❌ |
| Notification system | Limited | ❌ | ✅ (rich) | Log-based |
| Agent-writable UI API | ❌ | ❌ | ✅ | ❌ |
| State machine governance | ❌ | ❌ | ❌ | ✅ |
| 24/7 headless daemon | ❌ | ❌ | ❌ | ✅ |
| Cross-agent memory | ❌ | ❌ | ❌ | ❌ |
| Task tracker / DAG | ❌ | Linear integration | ❌ | Basic tasks |
| Agent team roles | ❌ | ❌ | ❌ | ✅ |
| Rework loop | ❌ | ❌ | ❌ | ✅ |
| Open source | ✅ (Apache 2.0) | ❌ | ❌ | ✅ (MIT) |
| Cross-platform | ❌ (macOS) | ❌ (macOS) | ❌ (macOS) | ✅ (CLI) |

**No single tool has everything. Supermuschel can be the first.**

---

## 4. UI Recommendation for Supermuschel

### Decision Framework

Three archetypes exist in this market:

| Archetype | Example | Strengths | Weaknesses |
|---|---|---|---|
| **Electron GUI** | Superset, Conductor | Rich UX, mass appeal | Heavy, macOS-coupled |
| **Native GUI** | cmux (Swift) | Fast, small, deep OS integration | macOS-only, harder to maintain |
| **TUI/CLI** | orch.one, FrankenTUI/cass | Cross-platform, SSH/server-usable, keyboard-native | High learning curve, less approachable |

### My Recommendation: **Electron + Companion TUI**

> Don't pick one archetype. Win all three audiences.

#### Primary UI: Electron (Vite + React 19 + Tailwind v4)
**Rationale:**
1. The market has validated it: Superset (7.3k stars) and Conductor (Stripe/Notion engineers loving it) both chose Electron and users *don't complain about it*. Developer power users tolerate Electron because the workflows it unlocks far outweigh the RAM cost.
2. Building native Swift would require a Swift team, limits Linux/Windows expansion, and produces the exact same macOS-lock-in as competitors. No advantage.
3. Our FrankenTUI TUI mode gives the performance-critical path to power users anyway.
4. **cmux's killer features (agent-writable UI, sidebar badges, trigger-flash) can be 100% replicated in Electron** via a `supermuschel` IPC CLI — we don't need native GPU rendering for this.

#### Secondary UI: Pure TUI client (FrankenTUI)
- Runs over SSH, in tmux, on CI servers
- Built on FrankenTUI + same `br`/`bv`/`cass` sidecars
- Shares all business logic — only the renderer changes
- **No competitor has this.** Win the "power user on a headless server" audience.

#### Infrastructure: `supermuschel serve` daemon
- Orch.one proved the demand: "agents die when you close the laptop"
- Run as a background daemon (launchd on macOS, systemd on Linux)
- Electron connects to it when open; daemon runs 24/7 without it
- Structured JSON logs compatible with Datadog/Grafana/.

### Specific UI Design Principles (based on market signal)

**1. Sidebar = Live Status Board (from cmux)**
Every workspace entry shows:
- Current git branch (written by the agent)
- Progress indicator (0–100%, written by the agent)
- Status badge with SF Symbol icon (written by the agent)
- Agent's last activity timestamp

```bash
# Agents call this to update their sidebar entry
supermuschel set-status branch "feat/auth-refresh" --icon "arrow.triangle.branch"
supermuschel set-progress 0.62
supermuschel set-status test-state "passing" --icon "checkmark.circle"
supermuschel notify --title "Auth flow done" --body "15 tests passing, ready to review"
supermuschel trigger-flash  # flash this workspace's border for attention
```

**2. Three-column layout (taking Conductor's onboarding clarity)**
```
┌─────────────────┬───────────────────────────┬──────────────────┐
│  Mission Control │  Active Workspace          │  Context Panel   │
│  (bv DAG view)  │  Terminal + Diff viewer    │  cass history    │
│                 │                            │  br task detail  │
│  Workspace list │                            │  Agent output    │
│  with live badges│                           │  log stream      │
└─────────────────┴───────────────────────────┴──────────────────┘
```

**3. Review is first-class (from Conductor + orch.one)**
Dedicated "Review Queue" panel — every agent's completed work shows up here with:
- Diff viewer (accept/reject per file)
- **Rework button** → opens feedback prompt → agent retries with your notes
- Auto-merge on approval

**4. Notifications through the system (from cmux)**
- macOS system notifications via `NSUserNotificationCenter` (Electron supports this natively)
- In-app "flash" animation on workspace border
- Per-workspace notification preferences

**5. What to avoid**
- **Don't replicate Electron's worst sins**: avoid Chromium DevTools being visible, avoid 1GB+ RAM at idle. Use `process.contextIsolation = true`, preload scripts, and keep renderer lean.
- **Don't hide the terminal**: every competitor research shows developers want to *see* the agent working, not just a spinner. Keep raw terminal output front-and-center.
- **Don't require account for core features**: Superset gates cloud sync behind auth. Make all local features work without signup — optional account for sync/team features only.

---

## 5. Competitive Moat Summary

By the time Supermuschel ships the features above, the competitive matrix will look like:

| Feature | Superset | Conductor | cmux | Orch.one | **Supermuschel** |
|---|---|---|---|---|---|
| Git worktree isolation | ✅ | ✅ | ❌ | ✅ | ✅ |
| Multi-agent monitoring | ✅ | ✅ | ✅ | ✅ | ✅ |
| Diff viewer + review | ✅ | ✅ | ❌ | ❌ | ✅ |
| Rework loop | ❌ | ❌ | ❌ | ✅ | ✅ |
| Agent-writable UI API | ❌ | ❌ | ✅ | ❌ | ✅ |
| 24/7 headless daemon | ❌ | ❌ | ❌ | ✅ | ✅ |
| Cross-agent memory | ❌ | ❌ | ❌ | ❌ | ✅ (cass) |
| DAG task intelligence | ❌ | ❌ | ❌ | ❌ | ✅ (bv) |
| Local issue tracker | ❌ | ❌ | ❌ | ❌ | ✅ (br) |
| State machine governance | ❌ | ❌ | ❌ | ✅ | ✅ |
| Agent team roles | ❌ | ❌ | ❌ | ✅ | ✅ |
| Pure TUI mode | ❌ | ❌ | ❌ | ✅ | ✅ (FrankenTUI) |
| Open source MIT | ❌ | ❌ | ❌ | ✅ | ✅ |
| Cross-platform | ❌ | ❌ | ❌ | ✅ | ✅ (TUI + daemon) |
