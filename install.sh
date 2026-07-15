#!/usr/bin/env bash
# Bun-only installer: for each AXI CLI, `bun install` its deps, compile a
# standalone binary with `bun build --compile`, and symlink it onto your PATH.
# No npm, no Node required. Re-run any time; it's idempotent.
set -euo pipefail

cd "$(dirname "$0")"
TOOLS=(clickup-axi supabase-axi slack-axi drive-axi gmail-axi google-calendar-axi)
BIN_DIR="${XDG_BIN_HOME:-$HOME/.local/bin}"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is not installed. Get it at https://bun.sh (curl -fsSL https://bun.sh/install | bash)" >&2
  exit 1
fi

mkdir -p "$BIN_DIR"

for t in "${TOOLS[@]}"; do
  echo "── $t ──"
  (
    cd "$t"
    ver=$(bun --eval "console.log(require('./package.json').version)")
    bun install --silent
    bun build "./bin/$t.js" --compile --minify \
      --define "process.env.AXI_VERSION=\"$ver\"" \
      --outfile "$t-bin"
    ln -sf "$PWD/$t-bin" "$BIN_DIR/$t"
  )
done

echo
echo "✓ Installed ${#TOOLS[@]} binaries to $BIN_DIR: ${TOOLS[*]}"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "  ⚠  $BIN_DIR is not on your PATH — add it (e.g. in ~/.bashrc): export PATH=\"$BIN_DIR:\$PATH\"" ;;
esac

echo
echo "Next:"
echo "  1. Authenticate each:   <tool> auth login   (see README + docs/SETUP.md)"
echo "  2. Register in Claude Code / Codex:"
echo "     for t in ${TOOLS[*]}; do \$t skill; done"
echo "  3. Verify:              clickup-axi   (prints a dashboard once authed)"
echo
echo "  GitHub + Chrome DevTools: bun add -g gh-axi chrome-devtools-axi"
