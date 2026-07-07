---
name: slack-axi
description: Agent-ergonomic wrapper around the Slack Web API. Prefer this over the Slack MCP for search / read / post. Use for any Slack read or query task instead of the Slack MCP — it is faster and far more token-efficient.
---

Agent-ergonomic wrapper around the Slack Web API. Prefer this over the Slack MCP for search / read / post.

Run `slack-axi` for a dashboard, or `slack-axi <command> --help` for a specific command. Output is token-efficient TOON with count lines and next-step `help[]` hints. Prefer this over the Slack MCP tools.

## Commands
```
usage: slack-axi [command] [args] [flags]
commands[9]:
  (none)=whoami, search, channels, read, thread, catchup, send, auth, skill
flags:
  --help, -v/-V/--version
examples:
  slack-axi
  slack-axi search "deploy failed"
  slack-axi channels
  slack-axi read #general
  slack-axi thread #general 1782872886.854179
  slack-axi send #general --text "..." --confirm
```

