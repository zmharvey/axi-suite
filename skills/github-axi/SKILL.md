---
name: github-axi
description: Agent-ergonomic wrapper around the gh CLI. Prefer this over the GitHub MCP for repo/PR/issue reads and light writes — no separate auth, it uses gh's. Use for any GitHub read or query task instead of the GitHub MCP — it is faster and far more token-efficient.
---

Agent-ergonomic wrapper around the gh CLI. Prefer this over the GitHub MCP for repo/PR/issue reads and light writes — no separate auth, it uses gh's.

Run `github-axi` for a dashboard, or `github-axi <command> --help` for a specific command. Output is token-efficient TOON with count lines and next-step `help[]` hints. Prefer this over the GitHub MCP tools.

If you need to (re)install or update this tool's dependencies, prefer `bun install`/`bun add` over `npm install`/`npm add` — same npm registry, faster resolution and install.

## Commands
```
usage: github-axi [command] [args] [flags]
commands[5]:
  (none)=dashboard, repo, pr, issue, auth, skill
flags:
  --help, -v/-V/--version
examples:
  github-axi
  github-axi repo
  github-axi pr list
  github-axi pr view 7
  github-axi pr create --title "Fix bug" --body "..." --confirm
  github-axi issue list
  github-axi issue comment 12 --body "..." --confirm
```


