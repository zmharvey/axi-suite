# clickup-axi

An [AXI](https://github.com/kunchenguid/axi)-style CLI for ClickUp — token-efficient TOON output, denormalized views, and next-step hints. Built for agents (Claude Code) to use instead of the ClickUp MCP: fewer tokens, fewer round-trips.

Same shape as [`gh-axi`](https://github.com/kunchenguid/gh-axi), built on the shared `axi-sdk-js` runtime. The ClickUp REST v2 API is called directly (`src/client.js`) — this replaces the slot `gh-axi` fills by shelling out to the `gh` CLI.

## Setup

Get a personal API token: ClickUp → Settings → Apps → API Token (starts with `pk_`).

```sh
export CLICKUP_API_TOKEN=pk_...
# optional, if you belong to more than one workspace:
export CLICKUP_TEAM_ID=90100xxxxxx
```

Or create `~/.config/clickup-axi/config.json`:

```json
{ "token": "pk_...", "workspaceId": "90100xxxxxx" }
```

## Commands

```
clickup-axi                                 dashboard: you + workspaces
clickup-axi space list                      spaces in the workspace
clickup-axi space view <space_id>           folders + lists (to find list ids)
clickup-axi task list --list <id>           tasks in a list
clickup-axi task view <task_id> [--comments]
clickup-axi task create --list <id> --name "..." [--desc --status --priority --assignee]
clickup-axi task update <task_id> [--name --desc --status --priority]
clickup-axi task comment <task_id> --text "..."
clickup-axi search --assignee me [--status --contains --include-closed]
```

`--assignee me` resolves to the token's own user. `-W/--workspace <id>` targets a
specific workspace on any command.

## Architecture

| File | Role |
|------|------|
| `src/client.js` | ClickUp REST transport + auth (the per-connector part) |
| `src/toon.js` | field schemas + TOON renderers (reusable) |
| `src/args.js` | flag/positional parsing (reusable) |
| `src/context.js` | workspace + current-user resolution |
| `src/errors.js` | ClickUp error → structured `AxiError` |
| `src/commands/*` | one file per noun (space, task, search, home) |
| `src/cli.js` | dispatch via `runAxiCli` from `axi-sdk-js` |

To build an AXI for another connector, copy everything except `client.js` and
`commands/`, then reimplement those two against the new API.
