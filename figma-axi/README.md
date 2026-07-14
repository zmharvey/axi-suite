# figma-axi

An [AXI](https://github.com/kunchenguid/axi)-style CLI for Figma — token-efficient TOON output, denormalized views, and next-step hints. Built for agents (Claude Code) to use instead of a Figma MCP: fewer tokens, fewer round-trips for file/project browsing, node lookup, image-export URLs, and comments.

Same shape as [`mongo-axi`](../mongo-axi)/`clickup-axi`, built on the shared `axi-sdk-js` runtime. Talks to the Figma REST API (`https://api.figma.com/v1`) over HTTPS using a personal access token.

## Setup

```sh
export FIGMA_API_TOKEN="figd_..."
```

Or create `~/.config/figma-axi/config.json`:

```json
{ "token": "figd_..." }
```

Or run `figma-axi auth login` and paste the token (hidden input; stored at `~/.config/figma-axi/token`, chmod 600). Get a personal access token from Figma → Settings → Personal access tokens.

## Commands

```
figma-axi                                          dashboard
figma-axi file <file_key> [--depth n]              compact file summary (pages + top-level frames)
figma-axi node <file_key> --ids <id1,id2,...>       detail for specific nodes
figma-axi image <file_key> --ids <id1,id2,...>
  [--format png|svg|pdf|jpg] [--scale n]            rendered-image URLs
figma-axi comments <file_key>                       list comments
figma-axi comment <file_key> --text "..."
  [--node-id <id>] [--confirm]                      post a comment (draft-first)
figma-axi teams <team_id> projects                  list projects in a team
figma-axi projects <project_id> files               list files in a project
```

`image` returns rendered-image **URLs**, not image bytes — that's how the Figma API works; fetch the URL yourself to get the file. `comment` is draft-first: without `--confirm` it only shows what would be posted. Figma's REST API has no "list my teams" endpoint — get a `team_id` from a team URL (`figma.com/files/team/<team_id>/...`) or your Figma org admin.

## Scope

This covers day-to-day reads (file/node/project/team browsing, image-export URLs, comments) plus posting comments. It does **not** cover file editing (moving/creating/styling nodes), webhooks, or team/project administration — the Figma REST API's write surface for file content is limited, and this tool sticks to what agents actually need for context-gathering and light collaboration. Keep the Figma MCP (or Figma's own tools) around for design editing.

## Architecture

| File | Role |
|------|------|
| `src/client.js` | Figma REST client, token resolution, error mapping (the per-connector part) |
| `src/toon.js` | field schemas + TOON renderers (reusable) |
| `src/args.js` | flag/positional parsing (reusable) |
| `src/errors.js` | Figma API error → structured `AxiError` |
| `src/commands/*` | one file per verb (file, node, image, comments, teams, projects, home) |
| `src/cli.js` | dispatch via `runAxiCli` from `axi-sdk-js` |

To build an AXI for another connector, copy everything except `client.js` and
`commands/`, then reimplement those two against the new API.
