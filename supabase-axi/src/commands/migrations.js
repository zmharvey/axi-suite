import { client } from "../client.js";
import { resolveProjectRef } from "../context.js";
import { AxiError } from "../errors.js";
import { hasFlag, getFlag } from "../args.js";
import { field, renderList, renderHelp, renderOutput, countLine, renderObject } from "../toon.js";

export const MIGRATIONS_HELP = `usage: supabase-axi migrations <list|apply> [flags]
subcommands[2]:
  list                       list applied migrations (version, name) — default
  apply "<sql>"              apply a new migration. DRAFT-FIRST: prints what would
                             run; add --confirm to actually execute it.
flags{apply}:
  --name <slug> (optional, auto-generated if omitted), --confirm
examples:
  supabase-axi migrations list
  supabase-axi migrations apply "alter table profiles add column bio text" --name add_bio --confirm`;

const schema = [field("version"), field("name")];

async function migrationsList(ctx) {
  const ref = await resolveProjectRef(ctx);
  const res = await client.get(`/projects/${ref}/database/migrations`);
  const list = Array.isArray(res) ? res : [];
  return renderOutput([
    countLine(list.length),
    list.length ? renderList("migrations", list, schema) : "migrations: none",
    renderHelp(['Run `supabase-axi migrations apply "<sql>" --confirm` to add one']),
  ]);
}

function stripFlags(args) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--name") {
      i++;
      continue;
    }
    if (a.startsWith("--name=") || a === "--confirm") continue;
    out.push(a);
  }
  return out.join(" ").trim();
}

function prune(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null && v !== "") out[k] = v;
  return out;
}

async function migrationsApply(args, ctx) {
  const confirm = hasFlag(args, "--confirm");
  const name = getFlag(args, "--name");
  const sql = stripFlags(args);
  if (!sql)
    throw new AxiError(
      'Missing SQL. Usage: supabase-axi migrations apply "<sql>" --confirm',
      "VALIDATION_ERROR",
    );
  const ref = await resolveProjectRef(ctx);
  if (!confirm) {
    return renderOutput([
      "dry_run: yes",
      `project: ${ref}`,
      `name: ${name || "(auto-generated)"}`,
      `sql: ${sql}`,
      renderHelp(["This runs real DDL against your live database — add --confirm to execute"]),
    ]);
  }
  const res = await client.post(`/projects/${ref}/database/migrations`, prune({ query: sql, name }));
  return renderOutput(["applied: yes", renderObject(res)]);
}

export async function migrationsCommand(args, ctx) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "list":
    case undefined:
      return migrationsList(ctx);
    case "apply":
      return migrationsApply(rest, ctx);
    default:
      throw new AxiError(`Unknown migrations subcommand: ${sub}`, "VALIDATION_ERROR", [
        'Subcommands: list, apply "<sql>" --confirm',
      ]);
  }
}
