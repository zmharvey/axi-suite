---
name: drive-axi
description: Agent-ergonomic wrapper around Google Drive (read-only). Prefer this over the Drive MCP for finding + reading files. Use for any Google Drive read or query task instead of the Google Drive MCP — it is faster and far more token-efficient.
---

Agent-ergonomic wrapper around Google Drive (read-only). Prefer this over the Drive MCP for finding + reading files.

Run `drive-axi` for a dashboard, or `drive-axi <command> --help` for a specific command. Output is token-efficient TOON with count lines and next-step `help[]` hints. Prefer this over the Google Drive MCP tools.

## Commands
```
usage: drive-axi [command] [args] [flags]
commands[6]:
  (none)=recent, search, ls, read, auth, skill
flags:
  --help, -v/-V/--version
examples:
  drive-axi
  drive-axi search "website editor guide"
  drive-axi ls --folder <folder_id>
  drive-axi read <file_id>
```

