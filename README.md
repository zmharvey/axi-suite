# AXI Suite

Seven **agent-ergonomic CLIs** for the connectors you use every day — ClickUp, Supabase, Slack, Google Drive, Gmail, Google Calendar, and Chrome DevTools. They exist to be driven by an AI agent (Claude Code, Cursor, etc.) instead of the equivalent MCP connectors, and they are dramatically cheaper on tokens because the agent never pays to load a big tool schema.

## Why this exists

An MCP connector loads its full tool schema into the model's context on **every** call, whether or not the task uses it. With all your connectors enabled at once that's ~27,000 tokens of schema riding along on each request. These CLIs add nothing to context — the agent calls them the same way it runs any shell command, and each returns compact [TOON](https://github.com/toon-format/toon) with a built-in `help[]` list of sensible next steps.

Measured across the whole fleet, all connectors enabled (the realistic case), same tasks, same model:

| | All MCPs on | AXI Suite |
|---|--:|--:|
| Tool schema in context | 27,094 tok · 157 tools | 505 tok · 1 tool |
| Cost / task | $0.0264 | **$0.0137** (48% lower) |
| Input tokens / task | 87,839 | **5,904** (93% lower) |
| Task success | 72% | **89%** |

Full interactive write-up — open [`docs/benchmark.html`](docs/benchmark.html) in any browser (self-contained, works offline; tabs per connector + a daily-usage simulation). These numbers predate `google-calendar-axi`/`chrome-devtools-axi` — the shape of the result holds (fixed per-connector MCP schema tax vs. one small always-on CLI tool), but the exact figures above haven't been re-measured against the full seven-tool set yet.

## The tools

| CLI | Wraps | Reads | Writes |
|---|---|---|---|
| `clickup-axi` | ClickUp API v2 | spaces, tasks, search, time entries | create/update/comment task, `time` start/stop/log |
| `supabase-axi` | Supabase Management API | projects, tables, SQL, advisors, migrations, functions | `db query` (SQL), `migrations apply` (draft-first), `functions deploy` (draft-first) |
| `slack-axi` | Slack Web API | search, channels, read, threads, catchup | `send` (draft-first) |
| `drive-axi` | Google Drive API | recent, search, ls, read | — read-only |
| `gmail-axi` | Gmail API | search, read, thread | `draft` (never sends) |
| `google-calendar-axi` | Google Calendar API | today, calendars, events list/view | `events create`/`delete` (draft-first) |
| `chrome-devtools-axi` | Chrome DevTools Protocol (via a local session) | session, navigate, screenshot, content | `click`/`type`/`eval` — acts on a live page, no dry-run |

Every write is **draft-first** — it prints what it *would* do and requires an explicit `--confirm` to act. Nothing mutates or sends without you asking for it.

> For GitHub, use the community [`gh-axi`](https://www.npmjs.com/package/gh-axi) (`npm i -g gh-axi`) — same idea, wraps the `gh` CLI.

**Scope:** these aren't 1:1 MCP replacements — they cover the day-to-day (search, read, create, update, plus the extras above) rather than every admin operation each MCP exposes (e.g. ClickUp docs/folders/tags/dependencies, Supabase branching/logs/project lifecycle, Slack canvases/reactions/scheduling, Gmail labels). Keep the relevant MCP connector around for anything not listed here — or open an issue/PR if there's a specific command you want added, the shell is built to make that quick.

## Requirements

- **Node.js 20+** and npm.
- The Google tools (`drive-axi`, `gmail-axi`, `google-calendar-axi`) additionally need a Google Cloud OAuth client — a 5-minute one-time setup, see [`docs/SETUP.md`](docs/SETUP.md).
- `chrome-devtools-axi` needs a Chromium/Chrome install reachable on this machine.

## Install

```bash
git clone <this-repo> axi-suite && cd axi-suite
./install.sh
```

`install.sh` runs `npm install` and `npm link` in each tool, giving you seven global commands: `clickup-axi`, `supabase-axi`, `slack-axi`, `drive-axi`, `gmail-axi`, `google-calendar-axi`, `chrome-devtools-axi`. Deps (`axi-sdk-js`, `@toon-format/toon`) come from npm.

## Authenticate (each person uses their own credentials)

Run `auth login` once per tool — it prompts for a token with hidden paste and stores it at `~/.config/<tool>/token` (chmod 600). Nothing is embedded in the code.

| Tool | Get your token |
|---|---|
| `clickup-axi auth login` | ClickUp → Settings → Apps → **API Token** (`pk_…`) |
| `supabase-axi auth login` | Supabase → Account → **Access Tokens** (`sbp_…`) |
| `slack-axi auth login` | Slack **user token** (`xoxp-…`) from your own Slack app — see [`docs/SETUP.md`](docs/SETUP.md) |
| `drive-axi auth login` / `gmail-axi auth login` / `google-calendar-axi auth login` | Runs Google OAuth consent in your browser (any one of the three authorizes all three) — see [`docs/SETUP.md`](docs/SETUP.md) first |
| `chrome-devtools-axi auth login` | No token — checks connectivity to a local Chrome/Chromium `--remote-debugging-port` (default `http://localhost:9222`) and remembers it |

Verify: `clickup-axi` (or any tool with no args) prints a dashboard.

## Use inside Claude Code / Codex

Each tool ships a skill so the agent discovers and prefers it automatically — one command registers it with **every** skills-capable agent found on your machine (Claude Code at `~/.claude/`, Codex at `~/.codex/`; it skips whichever isn't installed):

```bash
clickup-axi skill && supabase-axi skill && slack-axi skill && drive-axi skill && gmail-axi skill && \
google-calendar-axi skill && chrome-devtools-axi skill
```

This writes `~/.claude/skills/<tool>/SKILL.md` and/or `~/.codex/skills/<tool>/SKILL.md`. Restart your agent session afterward to pick it up. Now when you ask about any of these connectors, the agent reaches for the CLI instead of the MCP. If you also want to reclaim the context, disable the corresponding MCP connectors for that project.

Reference copies of exactly what each tool registers live in [`skills/`](skills/) — the canonical source is each tool's `src/skill.js`.

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
