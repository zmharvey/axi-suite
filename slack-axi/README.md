# slack-axi

An [AXI](https://axi.md)-style CLI for Slack — token-efficient TOON output, next-step hints. Built for agents to use instead of the Slack MCP. Same shell as `clickup-axi`/`supabase-axi`, built on `axi-sdk-js`; talks to the Slack Web API directly (`src/client.js`).

## Setup

Create a Slack app with **user-token scopes**, install it to your workspace, and copy the User OAuth Token (`xoxp-…`). Suggested scopes: `search:read`, `channels:read`, `groups:read`, `channels:history`, `groups:history`, `im:history`, `mpim:history`, `users:read`, `chat:write` (to post as you), and `files:read` (to fetch a file's actual content with `file`).

File attachments: their name, id, and permalink show up in `search`/`read`/`thread` output without `files:read`. With `files:read`, run `slack-axi file <file_id>` to fetch the content — text prints inline, everything else (PDF, images, docs) downloads to a local path you can open or read directly.

```sh
export SLACK_TOKEN=xoxp-...
```

Or `~/.config/slack-axi/token` (plain text) / `~/.config/slack-axi/config.json` `{ "token": "xoxp-..." }`.

## Commands

```
slack-axi                            whoami + workspace
slack-axi search "<query>"           search messages (Slack operators work)
slack-axi channels [--types ...]     list channels + ids
slack-axi read <#channel|id>         recent messages in a channel
slack-axi thread <#channel|id> <ts>  replies in a thread
slack-axi send <#channel|id> --text "..." [--confirm]   post AS YOU (dry-run without --confirm)
```

`send` posts under your own account and is **draft-first**: without `--confirm` it only prints what it would send.
