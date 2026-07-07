#!/usr/bin/env bash
# Installs all five AXI CLIs globally via npm link.
# Re-run any time; it's idempotent.
set -euo pipefail

cd "$(dirname "$0")"
TOOLS=(clickup-axi supabase-axi slack-axi drive-axi gmail-axi)

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
echo "     clickup-axi skill && supabase-axi skill && slack-axi skill && drive-axi skill && gmail-axi skill"
echo "  3. Verify:              clickup-axi   (prints a dashboard once authed)"
