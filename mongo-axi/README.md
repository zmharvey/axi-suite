# mongo-axi

An [AXI](https://github.com/kunchenguid/axi)-style CLI for MongoDB — token-efficient TOON output, denormalized views, and next-step hints. Built for agents (Claude Code) to use instead of a MongoDB MCP: fewer tokens, fewer round-trips.

Same shape as [`clickup-axi`](../clickup-axi)/`gh-axi`, built on the shared `axi-sdk-js` runtime. Unlike the REST-backed tools in this suite, `mongo-axi` talks to a MongoDB server/cluster directly over the wire using the official `mongodb` driver (`src/client.js`) — there's no HTTP API in between.

## Setup

Auth here is a full MongoDB connection string, not an API token.

```sh
export MONGO_AXI_URI="mongodb+srv://user:pass@cluster.mongodb.net"
export MONGO_AXI_DEFAULT_DB=shop   # optional — lets you skip --db on every command
```

Or create `~/.config/mongo-axi/config.json`:

```json
{ "uri": "mongodb+srv://user:pass@cluster.mongodb.net", "defaultDb": "shop" }
```

Or run `mongo-axi auth login` and paste the connection string (hidden input; stored at `~/.config/mongo-axi/token`, chmod 600).

## Commands

```
mongo-axi                                          dashboard: configured URI (masked) + reachable databases
mongo-axi db list                                  database names
mongo-axi collections list --db <name>             collection names in a database
mongo-axi find <collection> --db <name>
  [--filter '<json>'] [--limit n] [--fields a,b,c]  read documents (limit default 20)
mongo-axi count <collection> --db <name> [--filter '<json>']
mongo-axi indexes <collection> --db <name>         list indexes
mongo-axi insert <collection> --db <name> --doc '<json>' [--confirm]
mongo-axi update <collection> --db <name> --filter '<json>' --set '<json>' [--confirm]
mongo-axi delete <collection> --db <name> --filter '<json>' [--confirm]
```

`--db` is required on every collection-scoped command unless `defaultDb` is set in config or `MONGO_AXI_DEFAULT_DB` is exported — Mongo has no single "current workspace" the way ClickUp/Slack do, so there's no implicit default beyond that.

Every write (`insert`, `update`, `delete`) is **draft-first**: without `--confirm` it prints what would happen — including how many documents currently match the filter — and never touches the database. `update` only supports a flat `$set`; it does not accept arbitrary update operators like `$inc`/`$push`/`$unset`. `delete` refuses an empty `--filter` (it would match the whole collection).

## Scope

This covers day-to-day reads and simple writes: `find`/`count`/`indexes` plus draft-first `insert`/`update` (`$set`-only)/`delete`. It does **not** cover Mongo admin operations — creating/dropping/rebuilding indexes, replica set administration, or Atlas cluster/project management. Keep a MongoDB MCP (if one exists) around for that, or open an issue/PR.

## Architecture

| File | Role |
|------|------|
| `src/client.js` | MongoDB driver connection, URI/config resolution, BSON→plain sanitization (the per-connector part) |
| `src/toon.js` | field schemas + TOON renderers (reusable) |
| `src/args.js` | flag/positional parsing (reusable) |
| `src/json-arg.js` | JSON flag parsing (`--filter`/`--doc`/`--set`) with validation hints |
| `src/errors.js` | MongoDB driver error → structured `AxiError` |
| `src/commands/*` | one file per verb (db, collections, find, count, indexes, insert, update, delete, home) |
| `src/cli.js` | dispatch via `runAxiCli` from `axi-sdk-js` |

To build an AXI for another connector, copy everything except `client.js` and
`commands/`, then reimplement those two against the new API.
