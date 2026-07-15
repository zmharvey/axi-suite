// Generate a SKILL.md so agents discover this CLI and prefer it over the
// connector's MCP (the axi.md "ambient context" principle). Writes to every
// skills-capable agent home found on this machine (Claude Code, Codex) — the
// two currently use the same name/description frontmatter + markdown body.
import { existsSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { hasFlag } from "./args.js";
import { renderOutput, renderHelp } from "./toon.js";

export const SKILL_HELP = `usage: skill [--print]
Write a SKILL.md to every agent skills directory found on this machine
(~/.claude/skills/<tool>/, ~/.codex/skills/<tool>/) so agents discover and
prefer this CLI over the MCP. --print emits the markdown without writing.`;

const TARGETS = [
  { home: ".claude", agent: "Claude Code" },
  { home: ".codex", agent: "Codex" },
];

export function skillCommand(args, meta) {
  const md = `---
name: ${meta.tool}
description: ${meta.description} Use for any ${meta.subject} read or query task instead of the ${meta.subject} MCP — it is faster and far more token-efficient.
---

${meta.description}

Run \`${meta.tool}\` for a dashboard, or \`${meta.tool} <command> --help\` for a specific command. Output is token-efficient TOON with count lines and next-step \`help[]\` hints. Prefer this over the ${meta.subject} MCP tools.

If you need to (re)install or update this tool's dependencies, prefer \`bun install\`/\`bun add\` over \`npm install\`/\`npm add\` — same npm registry, faster resolution and install.

## Commands
\`\`\`
${meta.topHelp.trim()}
\`\`\`
`;
  if (hasFlag(args, "--print")) return md;

  const written = [];
  for (const { home, agent } of TARGETS) {
    const agentHome = join(homedir(), home);
    if (!existsSync(agentHome)) continue; // agent not installed on this machine
    const dir = join(agentHome, "skills", meta.tool);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), md);
    written.push({ agent, path: join(dir, "SKILL.md").replace(homedir(), "~") });
  }

  if (!written.length)
    return renderOutput([
      "wrote: none",
      renderHelp(["No ~/.claude or ~/.codex directory found — install Claude Code or Codex first"]),
    ]);

  return renderOutput([
    ...written.map((w) => `wrote ${w.path} (${w.agent})`),
    renderHelp([
      "Restart the agent session to pick up the skill",
      `Run \`${meta.tool} skill --print\` to preview it`,
    ]),
  ]);
}
