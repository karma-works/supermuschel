# Supermuschel — Agent Sandboxing & Isolation

> Research question: Should we integrate sandboxing, starting from yolobox? What are the alternatives?

---

## Why Sandboxing Matters Here

Every competitor (Superset, Conductor, cmux, orch.one) runs agents **directly on the host system**. This means:
- A single bad prompt can `rm -rf ~`, delete SSH keys, exfiltrate credentials, or corrupt other projects
- Agents running in parallel can accidentally interfere with each other's filesystem state
- Users who want "YOLO mode" (full auto, no confirmation) currently have no safety net

Sandboxing would be a **differentiator**: every competitor currently assumes you trust the agent completely. We don't have to.

---

## 1. yolobox (`finbarr/yolobox`)

**Repo**: https://github.com/finbarr/yolobox  
**Stars**: ~86 ⭐ (very new — early 2026)  
**Language**: Go  
**License**: MIT  
**Dependencies**: Docker or Podman (must be installed separately)

### What it does
A thin Go CLI that wraps any AI agent in a Docker/Podman container:
- Mounts **only** the project directory (`/path/to/project`) at its real path
- Does **not** mount `$HOME` — SSH keys, `.env` files, other projects are invisible to the agent
- Agent has full `sudo` inside the container — can install packages, run anything
- Pre-built base image includes: Claude Code, Codex, Gemini CLI, Node 22, Python 3, Go, Bun, ripgrep, fd, fzf, jq, git, gh

```bash
cd /path/to/project
yolobox claude   # Agent runs sandboxed, goes full auto
yolobox codex
yolobox gemini
```

### Security Model
| Protection | Status |
|---|---|
| Home directory (`~`) | ✅ Protected |
| SSH keys, credentials | ✅ Protected |
| Other projects on machine | ✅ Protected |
| Project directory itself | ⚠️ Mounted read-write (agent can delete it) |
| Network access | ⚠️ Enabled by default (`--no-network` flag exists) |
| Container escape (kernel exploit) | ❌ Not protected — shared kernel |
| Adversarial AI deliberately escaping | ❌ Not protected |

### Verdict: 🟡 Interesting concept, too early to commit to as-is

**Strengths:**
- MIT license, clean Go CLI, Homebrew tap
- Exactly the "yolo mode" philosophy we want to support
- Project-local Docker config (`yolobox.yaml`) for customization
- Session continuity across host/container boundary
- Rootless Podman mode for better host isolation

**Weaknesses:**
- Only 86 stars — very new, community not established
- **Requires Docker or Podman pre-installed** — adds a hard dependency that will frustrate users who just want to run an agent
- Container startup latency (~1-3s) on every workspace open
- No macOS-native sandbox path (uses Linux containers, which on macOS run inside a VM via Docker Desktop/OrbStack/Colima)
- Shared kernel = not true VM isolation. For truly malicious code: bypass risk exists.

---

## 2. The Full Sandboxing Landscape

### Tier 1: OS-Native Sandboxing (Zero Dependencies, Lightweight)

#### macOS `sandbox-exec` / Seatbelt
- The same mechanism that sandboxes App Store apps
- **Claude Code already uses this on macOS** (and Codex CLI, Gemini CLI)
- Profile-based: define allowed paths, network, syscalls
- **⚠️ Deprecated** by Apple as of macOS Sequoia (15.x) — still works but may disappear
- No overhead, no daemon, no Docker required
- Perfect for "protect home dir, allow project dir" use case

```bash
# Claude Code's actual sandbox profile (simplified)
(version 1)
(deny default)
(allow file-read* (subpath "/Users/user/project"))
(allow file-write* (subpath "/Users/user/project"))
(allow network*)
```

#### bubblewrap (Linux)
- **Claude Code and Gemini CLI use this on Linux/WSL2**
- Unprivileged namespace sandboxing — no root required
- Widely used by Flatpak, Snap, etc.
- Very lightweight, near-zero overhead
- Fine-grained bind mounts, read-only/read-write separation
- Not available on macOS

### Tier 2: Container-Based (Medium Weight, Docker/Podman required)

#### yolobox (described above)
- Good DX wrapper around Docker

#### Podman (rootless mode)
- Daemonless, rootless containers — significantly more secure than Docker
- Maps container root → unprivileged host user (container escapes are harmless)
- Works on macOS via Podman machine (lightweight VM)
- More secure than Docker Desktop

#### Lima + containerd
- Lightweight Linux VM on macOS (no Docker Desktop needed)
- Container-native, open-source alternative to Docker Desktop
- Used by Colima, Rancher Desktop, OrbStack under the hood

### Tier 3: MicroVMs (Strongest Isolation, More Setup)

#### Firecracker (AWS)
- MicroVMs: separate kernel per sandbox, ~125ms boot time
- **E2B uses this** — the gold standard for AI code execution
- Sub-millisecond security boundaries vs shared-kernel containers
- Linux only — not native on macOS (needs VM host)
- Not practical as an embedded desktop tool dependency

#### gVisor (Google)
- Userspace kernel that intercepts all syscalls
- **Claude Code web environment uses this**
- Stronger than containers, lighter than VMs
- Linux only

### Tier 4: Commercial/Cloud Sandboxes

#### E2B (`e2b.dev`)
- **11,300 ⭐** — market leader for cloud AI sandboxes
- Firecracker microVMs under the hood — strongest isolation
- 500M+ sandboxes started, used by 88% of Fortune 100
- Python + TypeScript SDKs
- **Cloud-only** — not suitable for local-first tool
- Free tier + paid plans (~$0.000165/sec)
- Self-hosting option exists (complex)

#### Modal
- Cloud function platform, popular for AI workloads
- Not local-first

---

## 3. Recommendation for Supermuschel

### Recommended Architecture: **Tiered sandboxing with no hard dependency**

Don't pick one — offer a progressive security ladder the user chooses:

```
Level 0 (default):  No sandbox — same as Superset/Conductor today
Level 1 (soft):     macOS Seatbelt / bubblewrap — OS-native, zero deps
Level 2 (standard): yolobox / Podman rootless — container isolation  
Level 3 (strong):   VM-backed container (Lima/Colima) — separate kernel
Level 4 (maximum):  E2B cloud sandbox — Firecracker microVM, off-device
```

**Ship Level 1 as the default "safe mode" toggle.** It's what Anthropic themselves use for Claude Code's built-in sandbox. No extra dependencies — just profile configuration. Show it as a per-workspace toggle:

```
⚙ Workspace Settings
  ☐ Sandbox mode
    ○ None (fastest, full host access)  
    ● OS Sandbox (recommended — protects home directory)
    ○ Container (yolobox/Podman — stronger isolation)
    ○ VM-backed (maximum isolation, slower)
```

### Specific Implementation Plan

#### Phase 1 (MVP): Seatbelt / bubblewrap
- macOS: generate a `sandbox-exec` profile per workspace that allows:
  - Read-write: the workspace worktree directory
  - Read-only: `/usr`, `/lib`, `/usr/local` (tools)
  - Block: `$HOME/.ssh`, `$HOME/.aws`, `$HOME/.config`, other worktrees
  - Network: configurable (allow/deny external)
- Linux: use `bwrap` (bubblewrap) with equivalent bind mounts
- Zero user-visible dependencies — works out of the box
- Integrate in the Electron main process: wrap `node-pty` spawn with the sandbox prefix

#### Phase 2 (Power Users): yolobox / Podman integration  
- Detect if Docker/Podman is available
- If available, offer container mode as Level 2
- Pre-build a `supermuschel` base image (fork of yolobox's base image) with all agents and tools baked in
- Start container with project worktree mounted, home dir excluded

#### Phase 3 (Optional): E2B integration
- For cloud/team users who want zero local footprint
- Agent runs entirely on E2B infrastructure — nothing touches host
- Good for CI/CD mode (`supermuschel serve`)

---

## 4. Competitive Moat Added by Sandboxing

This is a major differentiator. No competitor offers it:

| Tool | Sandboxing |
|---|---|
| Superset | ❌ None — agent runs on host |
| Conductor | ❌ None |
| cmux | ⚠️ Note in docs about Claude Code sandbox socket conflict |
| Orch.one | ❌ None |
| **Supermuschel** | ✅ **Tiered: OS-native → Container → VM → Cloud** |

**Marketing angle**: *"Run agents in full YOLO mode. Your home directory, SSH keys, and other projects are untouchable."*

---

## 5. The `sandbox-exec` Deprecation Problem

> ⚠️ Apple deprecated `sandbox-exec` / Seatbelt in macOS Sequoia and later. It still works but **may be removed** in a future macOS version.

**Mitigation options:**
1. **Apple Container framework**: macOS Tahoe (15+) introduces a new lightweight container API — yolobox already plans to support it as a runtime. This is the future of macOS-native containerization with Apple's blessing.
2. **Podman rootless**: Already Linux-standard, Apple Silicon support is solid.
3. **Short-term**: Use `sandbox-exec` where available, fall back to Podman container mode if not.

**Recommendation**: Support both paths in Supermuschel, with auto-detection. The UX is the same either way.

---

## 6. Star Count / Maturity Summary

| Tool | Stars | Maturity | Local-first | macOS | Linux |
|---|---|---|---|---|---|
| **E2B** | 11,300 ⭐ | Production | ❌ Cloud | via SDK | via SDK |
| **bubblewrap** | ~2,000 ⭐ | Very mature | ✅ | ❌ | ✅ |
| **gVisor** | ~16,000 ⭐ | Production | ⚠️ Complex | ❌ | ✅ |
| **Firecracker** | ~26,000 ⭐ | Production | ⚠️ Complex | ❌ | ✅ |
| **Podman** | ~26,000 ⭐ | Production | ✅ | ✅ | ✅ |
| **Lima** | ~18,000 ⭐ | Mature | ✅ | ✅ | - |
| **yolobox** | ~86 ⭐ | Very early | ✅ | ✅ | ✅ |
| **macOS Seatbelt** | N/A (OS built-in) | Mature/deprecated | ✅ | ✅ | ❌ |
