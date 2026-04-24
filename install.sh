#!/usr/bin/env bash
# Supermuschel headless server installer for Linux
# Usage: curl -fsSL https://raw.githubusercontent.com/supermuschel/supermuschel/main/install.sh | bash
set -euo pipefail

REPO="karma-works/supermuschel"
INSTALL_DIR="${SUPERMUSCHEL_INSTALL_DIR:-/usr/local/bin}"
DATA_DIR="${SUPERMUSCHEL_DATA_DIR:-$HOME/.supermuschel}"
PORT="${SUPERMUSCHEL_PORT:-3000}"
WORKDIR="${SUPERMUSCHEL_WORKDIR:-$HOME}"

# ── Detect arch ───────────────────────────────────────────────────────────────

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64)  ARCH_SUFFIX="linux-x64" ;;
  aarch64) ARCH_SUFFIX="linux-arm64" ;;
  *)
    echo "Unsupported architecture: $ARCH" >&2
    exit 1
    ;;
esac

# ── Resolve latest version ────────────────────────────────────────────────────

if command -v curl &>/dev/null; then
  FETCH="curl -fsSL"
elif command -v wget &>/dev/null; then
  FETCH="wget -qO-"
else
  echo "curl or wget is required" >&2
  exit 1
fi

VERSION="$(
  $FETCH "https://api.github.com/repos/${REPO}/releases/latest" |
  grep '"tag_name"' | sed 's/.*"tag_name": *"v\([^"]*\)".*/\1/'
)"

if [[ -z "$VERSION" ]]; then
  echo "Could not determine latest version" >&2
  exit 1
fi

TARBALL="supermuschel-server-${ARCH_SUFFIX}.tar.gz"
URL="https://github.com/${REPO}/releases/download/v${VERSION}/${TARBALL}"

# ── Download & install ────────────────────────────────────────────────────────

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "→ Downloading Supermuschel ${VERSION} (${ARCH_SUFFIX})…"
$FETCH "$URL" -o "$TMP/$TARBALL" 2>/dev/null || $FETCH "$URL" > "$TMP/$TARBALL"
tar -xzf "$TMP/$TARBALL" -C "$TMP"

# Check whether we need sudo
NEEDS_SUDO=false
if [[ ! -w "$INSTALL_DIR" ]]; then
  NEEDS_SUDO=true
fi

SUDO=""
if $NEEDS_SUDO; then
  if command -v sudo &>/dev/null; then
    SUDO="sudo"
  else
    echo "Cannot write to $INSTALL_DIR and sudo is not available." >&2
    echo "Re-run as root or set SUPERMUSCHEL_INSTALL_DIR to a writable path." >&2
    exit 1
  fi
fi

$SUDO install -Dm755 "$TMP/supermuschel-server-${ARCH_SUFFIX}" "$INSTALL_DIR/supermuschel-server"

# Install web static assets alongside binary
WEB_DST="/usr/local/share/supermuschel/web"
$SUDO mkdir -p "$WEB_DST"
$SUDO cp -r "$TMP/web/." "$WEB_DST/"

# Install thin wrapper that sets --static-dir
$SUDO install -Dm755 /dev/stdin "$INSTALL_DIR/supermuschel" <<WRAPPER
#!/bin/sh
exec "$INSTALL_DIR/supermuschel-server" \\
  --static-dir "$WEB_DST" \\
  "\$@"
WRAPPER

echo "→ Installed to $INSTALL_DIR/supermuschel"

# ── Optional: systemd user service ────────────────────────────────────────────

if command -v systemctl &>/dev/null; then
  mkdir -p "$HOME/.config/systemd/user"
  cat > "$HOME/.config/systemd/user/supermuschel.service" <<SERVICE
[Unit]
Description=Supermuschel headless server
After=network.target

[Service]
ExecStart=$INSTALL_DIR/supermuschel --port $PORT --workdir $WORKDIR
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
SERVICE

  systemctl --user daemon-reload
  systemctl --user enable --now supermuschel.service
  echo "→ systemd user service enabled (port $PORT)"
  echo "   Manage: systemctl --user {start,stop,status,logs} supermuschel"
else
  echo ""
  echo "To start the server manually:"
  echo "  supermuschel --port $PORT --workdir $WORKDIR"
fi

echo ""
echo "Supermuschel ${VERSION} installed successfully!"
echo "Open http://localhost:${PORT} in your browser."
