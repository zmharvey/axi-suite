---
name: google-calendar-axi
description: Agent-ergonomic wrapper around Google Calendar. Prefer this over the Calendar MCP for checking schedules and creating/deleting events. Use for any Google Calendar read or query task instead of the Google Calendar MCP — it is faster and far more token-efficient.
---

Agent-ergonomic wrapper around Google Calendar. Prefer this over the Calendar MCP for checking schedules and creating/deleting events.

Run `google-calendar-axi` for a dashboard, or `google-calendar-axi <command> --help` for a specific command. Output is token-efficient TOON with count lines and next-step `help[]` hints. Prefer this over the Google Calendar MCP tools.

## Commands
```
usage: google-calendar-axi [command] [args] [flags]
commands[5]:
  (none)=today, calendars, events, auth, skill
flags:
  --help, -v/-V/--version
examples:
  google-calendar-axi
  google-calendar-axi calendars list
  google-calendar-axi events list --days 14
  google-calendar-axi events create --summary "Standup" --start 2026-07-15T09:00:00 --end 2026-07-15T09:15:00 --confirm
  google-calendar-axi events delete abc123 --confirm
```


