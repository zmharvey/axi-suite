import { runQuery } from "../client.js";
import { resolveProjectRef } from "../context.js";
import { AxiError } from "../errors.js";
import { getFlag } from "../args.js";
import { renderRows, renderHelp, renderOutput, countLine } from "../toon.js";

export const DB_HELP = `usage: supabase-axi db <query|tables> [flags]
subcommands[2]:
  query "<sql>"      run SQL against the project (Management API); returns rows as TOON
  tables             list base tables (schema, name, column count)
flags:
  -p/--project <ref>, --schema <name> (tables), --limit <n> (query, default 50)
examples:
  supabase-axi db query "select count(*) from auth.users"
  supabase-axi db query "select id, email from auth.users limit 5"
  supabase-axi db tables --schema public`;

function normalizeRows(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.result)) return res.result;
  if (res && Array.isArray(res.rows)) return res.rows;
  return [];
}

async function dbQuery(args, ctx) {
  const ref = await resolveProjectRef(ctx);
  const limit = Number(getFlag(args, "--limit")) || 50;
  const sql = args
    .filter((a, i) => a !== "--limit" && args[i - 1] !== "--limit" && !a.startsWith("--limit="))
    .join(" ")
    .trim();
  if (!sql)
    throw new AxiError('Missing SQL. Usage: supabase-axi db query "select ..."', "VALIDATION_ERROR");
  const rows = normalizeRows(await runQuery(ref, sql));
  const shown = rows.slice(0, limit);
  return renderOutput([
    countLine(rows.length, rows.length > limit ? `showing first ${limit}` : undefined),
    rows.length ? renderRows("rows", shown) : "rows: (no rows returned)",
  ]);
}

export async function dbTables(args, ctx) {
  const ref = await resolveProjectRef(ctx);
  const schemaFilter = getFlag(args, "--schema");
  const sql = `select t.table_schema as schema, t.table_name as name,
    (select count(*) from information_schema.columns c
       where c.table_schema = t.table_schema and c.table_name = t.table_name) as columns
    from information_schema.tables t
    where t.table_type = 'BASE TABLE'
      and t.table_schema not in ('pg_catalog','information_schema')
      ${schemaFilter ? `and t.table_schema = '${schemaFilter.replace(/'/g, "''")}'` : ""}
    order by 1, 2`;
  const rows = normalizeRows(await runQuery(ref, sql));
  return renderOutput([
    countLine(rows.length),
    rows.length ? renderRows("tables", rows) : "tables: none",
    renderHelp(['Run `supabase-axi db query "select * from <table> limit 10"` to inspect a table']),
  ]);
}

export async function dbCommand(args, ctx) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "query":
    case "q":
      return dbQuery(rest, ctx);
    case "tables":
      return dbTables(rest, ctx);
    default:
      throw new AxiError(`Unknown db subcommand: ${sub ?? "(none)"}`, "VALIDATION_ERROR", [
        'Subcommands: query "<sql>", tables',
      ]);
  }
}

// top-level `tables` alias
export function tablesCommand(args, ctx) {
  return dbTables(args, ctx);
}
