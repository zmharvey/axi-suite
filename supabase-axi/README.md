# supabase-axi

An [AXI](https://axi.md)-style CLI for Supabase — token-efficient TOON output, denormalized views, next-step hints. Built for agents to use instead of the Supabase MCP: fewer tokens, fewer round-trips. Same shape as `clickup-axi`/`gh-axi`, built on `axi-sdk-js`.

Talks to the **Supabase Management API** directly (`src/client.js`) with a Personal Access Token — this is the per-connector layer; everything else (TOON, arg parsing, dispatch) is the shared AXI shell.

## Setup

Get a Personal Access Token: supabase.com → Account → Access Tokens (starts with `sbp_`).

```sh
export SUPABASE_ACCESS_TOKEN=sbp_...
export SUPABASE_PROJECT_REF=xxxxxxxx   # optional default project
```

Or `~/.config/supabase-axi/token` (plain text, one line) / `~/.config/supabase-axi/config.json` `{ "token": "sbp_...", "projectRef": "..." }`.

## Commands

```
supabase-axi                          dashboard: your projects
supabase-axi tables [--schema public] base tables (schema, name, column count)
supabase-axi db query "select ..."    run SQL via the Management API, rows as TOON
supabase-axi db tables                same as `tables`
supabase-axi functions                edge functions
supabase-axi advisors [--type security|performance]   lints
```

`-p/--project <ref>` targets a project on any command; otherwise uses the sole project, `SUPABASE_PROJECT_REF`, or config.

> `db query` runs arbitrary SQL, including writes/DDL. Treat mutations with the same care as the SQL editor.
