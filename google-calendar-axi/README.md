# google-calendar-axi

An [AXI](https://github.com/kunchenguid/axi)-style CLI for Google Calendar — token-efficient TOON output, denormalized views, and next-step hints. Built for agents (Claude Code) to use instead of a Google Calendar MCP: fewer tokens, fewer round-trips for checking schedules and creating/deleting events.

Same shape as [`drive-axi`](../drive-axi)/`gmail-axi`, and shares their Google OAuth client and refresh token — see [`docs/SETUP.md`](../docs/SETUP.md). One `auth login` (from any of the three tools) authorizes all three.

## Setup

See [`docs/SETUP.md`](../docs/SETUP.md#google-drive--gmail--calendar-drive-axi-gmail-axi-google-calendar-axi). In short: create one Google Cloud OAuth "Desktop app" client, enable the Drive/Gmail/Calendar APIs, save the client id/secret to `~/.config/google-axi/oauth.json`, then run `google-calendar-axi auth login` once.

## Commands

```
google-calendar-axi                                        today's events (dashboard)
google-calendar-axi calendars list                         calendars you have access to
google-calendar-axi events list [--calendar <id>] [--days n]     upcoming events (default 7 days)
google-calendar-axi events view <event_id> [--calendar <id>]     full detail for one event
google-calendar-axi events create --summary "..." --start <ISO> --end <ISO>
  [--location "..."] [--description "..."] [--calendar <id>] [--confirm]
google-calendar-axi events delete <event_id> [--calendar <id>] [--confirm]
```

`--calendar` defaults to `"primary"` on every event/calendar-scoped command. `create` and `delete` are **draft-first**: without `--confirm` they only show what would happen — `delete` fetches and prints the target event first so you can confirm you're deleting the right one — and never touch the calendar.

## Scope

This covers day-to-day reads (calendars, upcoming/specific events) plus create/delete of events. It does **not** cover recurring-event rule editing, attendee invitations/RSVPs, calendar sharing/ACLs, or free/busy lookups across other people's calendars — the OAuth scope requested (`calendar.events`) is deliberately narrow (events only, no calendar-admin/ACL scope). Keep a Calendar MCP (if one exists) around for that, or open an issue/PR.

## Architecture

| File | Role |
|------|------|
| `src/google-auth.js` | shared Google OAuth token refresh + authed `fetch` (`gfetch`/`gfetchText`) — identical across `drive-axi`/`gmail-axi`/`google-calendar-axi` by design |
| `src/toon.js` | field schemas + TOON renderers (reusable) |
| `src/args.js` | flag/positional parsing (reusable) |
| `src/errors.js` | Google Calendar API error → structured `AxiError` |
| `src/commands/util.js` | Calendar-specific formatting (event/calendar schemas, relative time, ISO helpers) |
| `src/commands/*` | one file per verb (calendars, events, home) |
| `src/cli.js` | dispatch via `runAxiCli` from `axi-sdk-js` |

To build an AXI for another connector, copy everything except `client.js`/`google-auth.js` and
`commands/`, then reimplement those against the new API.
