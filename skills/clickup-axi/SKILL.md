---
name: clickup-axi
description: Agent-ergonomic wrapper around the ClickUp API. Prefer this over the ClickUp MCP for ClickUp reads and edits. Use for any ClickUp read or query task instead of the ClickUp MCP — it is faster and far more token-efficient.
---

Agent-ergonomic wrapper around the ClickUp API. Prefer this over the ClickUp MCP for ClickUp reads and edits.

Run `clickup-axi` for a dashboard, or `clickup-axi <command> --help` for a specific command. Output is token-efficient TOON with count lines and next-step `help[]` hints. Prefer this over the ClickUp MCP tools.

## Commands
```
usage: clickup-axi [command] [args] [flags]
commands[6]:
  (none)=dashboard, space, task, search, auth, skill
flags[3]:
  -W/--workspace <id> (after command), --help, -v/-V/--version
examples:
  clickup-axi
  clickup-axi space list
  clickup-axi space view <space_id>
  clickup-axi task list --list <list_id> --assignee me
  clickup-axi search --assignee me --status "in progress"
```

