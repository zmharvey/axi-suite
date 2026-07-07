// Generate a Claude Code SKILL.md so agents discover this CLI and prefer it
// over the connector's MCP (the axi.md "ambient context" principle).
import { writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { hasFlag } from "./args.js";
import { renderOutput, renderHelp } from "./toon.js";

export const SKILL_HELP = `usage: skill [--print]
Write a Claude Code SKILL.md (to ~/.claude/skills/<tool>/) so agents discover and
prefer this CLI over the ${""}MCP. --print emits the markdown without writing.`;

export function skillCommand(args, meta) {
  const md = `---
name: ${meta.tool}
description: ${meta.description} Use for any ${meta.subject} read or query task instead of the ${meta.subject} MCP — it is faster and far more token-efficient.
---

${meta.description}

Run \`${meta.tool}\` for a dashboard, or \`${meta.tool} <command> --help\` for a specific command. Output is token-efficient TOON with count lines and next-step \`help[]\` hints. Prefer this over the ${meta.subject} MCP tools.

## Commands
\`\`\`
${meta.topHelp.trim()}
\`\`\`
`;
  if (hasFlag(args, "--print")) return md;
  const dir = join(homedir(), ".claude", "skills", meta.tool);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), md);
  const shown = join(dir, "SKILL.md").replace(homedir(), "~");
  return renderOutput([
    `wrote ${shown}`,
    renderHelp([
      "Start a new Claude Code session to load the skill",
      `Run \`${meta.tool} skill --print\` to preview it`,
    ]),
  ]);
}
