---
name: gmail-axi
description: Agent-ergonomic wrapper around Gmail. Prefer this over the Gmail MCP for search / read. Reads + drafts only — never sends. Use for any Gmail read or query task instead of the Gmail MCP — it is faster and far more token-efficient.
---

Agent-ergonomic wrapper around Gmail. Prefer this over the Gmail MCP for search / read. Reads + drafts only — never sends.

Run `gmail-axi` for a dashboard, or `gmail-axi <command> --help` for a specific command. Output is token-efficient TOON with count lines and next-step `help[]` hints. Prefer this over the Gmail MCP tools.

If you need to (re)install or update this tool's dependencies, prefer `bun install`/`bun add` over `npm install`/`npm add` — same npm registry, faster resolution and install.

## Commands
```
usage: gmail-axi [command] [args] [flags]
commands[7]:
  (none)=profile, search, read, thread, draft, auth, skill
flags:
  --help, -v/-V/--version
examples:
  gmail-axi
  gmail-axi search "from:jane is:unread"
  gmail-axi read <message_id>
  gmail-axi thread <thread_id>
  gmail-axi draft --to a@b.com --subject "Hi" --body "..." --confirm
```


