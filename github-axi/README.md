# github-axi

An [AXI](https://github.com/kunchenguid/axi)-style CLI for GitHub — token-efficient TOON output, denormalized views, and next-step hints. Built for agents (Claude Code) to use instead of the GitHub MCP for repo/PR/issue reads and light writes.

Unlike every other tool in this suite, this one has **no client of its own** — it shells out to the [`gh`](https://cli.github.com) CLI and reformats its `--json` output as TOON. That means **no separate auth**: whatever account `gh` is logged into is what this tool uses. If `gh auth status` already works on your machine, `github-axi` already works too.

## Setup

Nothing to configure if `gh` is already installed and authenticated:

```sh
gh auth status   # already logged in? you're done.
```

If not:

```sh
github-axi auth login   # proxies straight to `gh auth login` (interactive)
```

## Commands

```
github-axi                                       dashboard: repo + up to 5 open PRs/issues
github-axi repo [<owner/repo>]                   repo metadata (defaults to cwd's repo)
github-axi pr list [--state open|closed|merged|all] [--limit n]
github-axi pr view <number>
github-axi pr checks <number>                     CI status (raw `gh pr checks` passthrough)
github-axi pr create --title "..." --body "..." [--base <branch>] [--confirm]
github-axi issue list [--state open|closed|all] [--limit n]
github-axi issue view <number>
github-axi issue create --title "..." --body "..." [--confirm]
github-axi issue comment <number> --body "..." [--confirm]
```

`pr create`, `issue create`, and `issue comment` are **draft-first**: without `--confirm` they only show what would happen and never touch GitHub. `pr checks` has no `--json` support in `gh` itself, so its output is passed through mostly as-is rather than reformatted.

## Scope

This covers day-to-day PR/issue triage: listing, viewing, checking CI status, and light creation/commenting. It does **not** cover reviews (`gh pr review`), merging, branch/release management, GitHub Actions workflow dispatch, or repo administration — `gh` itself already covers all of that directly; reach for it when you need more than this tool exposes.

## Architecture

| File | Role |
|------|------|
| `src/gh.js` | spawns `gh`, parses its `--json` output or captures raw text (the per-connector part — no HTTP client, no token handling) |
| `src/auth.js` | proxies to `gh auth login`/`logout`/`status` — no credential of its own to store |
| `src/toon.js` | field schemas + TOON renderers (reusable) |
| `src/args.js` | flag/positional parsing (reusable) |
| `src/errors.js` | failed `gh` invocation → structured `AxiError` |
| `src/commands/*` | one file per noun (repo, pr, issue, home) |
| `src/cli.js` | dispatch via `runAxiCli` from `axi-sdk-js` |

To build an AXI for another connector, copy everything except `gh.js`/`auth.js` and
`commands/`, then reimplement those against the new API.
