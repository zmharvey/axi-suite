# AXI Suite

Five **agent-ergonomic CLIs** for the connectors you use every day — ClickUp, Supabase, Slack, Google Drive, and Gmail. They exist to be driven by an AI agent (Claude Code, Cursor, etc.) instead of the equivalent MCP connectors, and they are dramatically cheaper on tokens because the agent never pays to load a big tool schema.

## Why this exists

An MCP connector loads its full tool schema into the model's context on **every** call, whether or not the task uses it. With all your connectors enabled at once that's ~27,000 tokens of schema riding along on each request. These CLIs add nothing to context — the agent calls them the same way it runs any shell command, and each returns compact [TOON](https://github.com/toon-format/toon) with a built-in `help[]` list of sensible next steps.

Measured across the whole fleet, all connectors enabled (the realistic case), same tasks, same model:

| | All MCPs on | AXI Suite |
|---|--:|--:|
| Tool schema in context | 27,094 tok · 157 tools | 505 tok · 1 tool |
| Cost / task | $0.0264 | **$0.0137** (48% lower) |
| Input tokens / task | 87,839 | **5,904** (93% lower) |
| Task success | 72% | **89%** |

Full benchmark write-up (interactive): the case-study artifact accompanying this suite.

## The tools

| CLI | Wraps | Reads | Writes |
|---|---|---|---|
| `clickup-axi` | ClickUp API v2 | spaces, tasks, search | create/update/comment task |
| `supabase-axi` | Supabase Management API | projects, tables, SQL, advisors | `db query` (SQL) |
| `slack-axi` | Slack Web API | search, channels, read, threads, catchup | `send` (draft-first) |
| `drive-axi` | Google Drive API | recent, search, ls, read | — read-only |
| `gmail-axi` | Gmail API | search, read, thread | `draft` (never sends) |

Every write is **draft-first** — it prints what it *would* do and requires an explicit `--confirm` to act. Nothing mutates or sends without you asking for it.

> For GitHub, use the community [`gh-axi`](https://www.npmjs.com/package/gh-axi) (`npm i -g gh-axi`) — same idea, wraps the `gh` CLI.

## Requirements

- **Node.js 20+** and npm.
- The Google tools (`drive-axi`, `gmail-axi`) additionally need a Google Cloud OAuth client — a 5-minute one-time setup, see [`docs/SETUP.md`](docs/SETUP.md).

## Install

```bash
git clone <this-repo> axi-suite && cd axi-suite
./install.sh
```

`install.sh` runs `npm install` and `npm link` in each tool, giving you five global commands: `clickup-axi`, `supabase-axi`, `slack-axi`, `drive-axi`, `gmail-axi`. Deps (`axi-sdk-js`, `@toon-format/toon`) come from npm.

## Authenticate (each person uses their own credentials)

Run `auth login` once per tool — it prompts for a token with hidden paste and stores it at `~/.config/<tool>/token` (chmod 600). Nothing is embedded in the code.

| Tool | Get your token |
|---|---|
| `clickup-axi auth login` | ClickUp → Settings → Apps → **API Token** (`pk_…`) |
| `supabase-axi auth login` | Supabase → Account → **Access Tokens** (`sbp_…`) |
| `slack-axi auth login` | Slack **user token** (`xoxp-…`) from your own Slack app — see [`docs/SETUP.md`](docs/SETUP.md) |
| `drive-axi auth login` / `gmail-axi auth login` | Runs Google OAuth consent in your browser — see [`docs/SETUP.md`](docs/SETUP.md) first |

Verify: `clickup-axi` (or any tool with no args) prints a dashboard.

## Use inside Claude Code

Each tool ships a Claude Code skill so the agent discovers and prefers it automatically:

```bash
clickup-axi skill && supabase-axi skill && slack-axi skill && drive-axi skill && gmail-axi skill
```

This writes `~/.claude/skills/<tool>/SKILL.md`. Now when you ask Claude Code about ClickUp/Supabase/Slack/Drive/Gmail, it reaches for the CLI instead of the MCP. If you also want to reclaim the context, disable the corresponding MCP connectors for that project.

## Optional: compile to standalone binaries

Slightly faster cold start (~10ms vs ~24ms). Requires [Bun](https://bun.sh):

```bash
cd clickup-axi
bun build ./bin/clickup-axi.js --compile --minify \
  --define 'process.env.AXI_VERSION="0.1.0"' --outfile clickup-axi-bin
```

Point your global symlink at the resulting binary. Trade-offs: ~60MB each, platform-specific (rebuild per OS/arch). The Node install above is cross-platform and the recommended default.

## Notes

- **Secrets** live only in `~/.config/<tool>/` and are git-ignored — none are stored in this repo.
- **Self-contained by design** — each tool vendors the small shared AXI shell, so you can copy out just one tool if that's all you need.
- MIT licensed.
