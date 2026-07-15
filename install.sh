#!/usr/bin/env bash
# Installs all AXI CLIs globally via npm link.
# Re-run any time; it's idempotent.
set -euo pipefail

cd "$(dirname "$0")"
TOOLS=(clickup-axi supabase-axi slack-axi drive-axi gmail-axi google-calendar-axi chrome-devtools-axi github-axi)

for t in "${TOOLS[@]}"; do
  echo "── installing $t ──"
  ( cd "$t" && npm install --silent && npm link )
done

echo
echo "✓ Installed: ${TOOLS[*]}"
echo
echo "Next:"
echo "  1. Authenticate each:   <tool> auth login   (see README + docs/SETUP.md)"
echo "  2. Register in Claude Code:"
echo "     for t in ${TOOLS[*]}; do \$t skill; done"
echo "  3. Verify:              clickup-axi   (prints a dashboard once authed)"
