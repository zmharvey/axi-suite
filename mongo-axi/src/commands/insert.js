import { withClient, resolveDb } from "../client.js";
import { AxiError } from "../errors.js";
import { getPositional, hasFlag } from "../args.js";
import { parseJsonFlag } from "../json-arg.js";
import { renderOutput, renderHelp, renderObject } from "../toon.js";

export const INSERT_HELP = `usage: mongo-axi insert <collection> --db <name> --doc '<json>' [--confirm]
Insert one document (a JSON object) or several (a JSON array of objects).
DRAFT-FIRST: without --confirm this only prints what would be inserted.
examples:
  mongo-axi insert users --db shop --doc '{"name":"Ada","status":"active"}'             # dry-run
  mongo-axi insert users --db shop --doc '{"name":"Ada","status":"active"}' --confirm   # inserts
  mongo-axi insert users --db shop --doc '[{"name":"Ada"},{"name":"Grace"}]' --confirm  # bulk insert`;

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export async function insertCommand(args) {
  const collection = getPositional(args, 0);
  if (!collection)
    throw new AxiError("Missing <collection>", "VALIDATION_ERROR", [
      "Usage: mongo-axi insert <collection> --db <name> --doc '<json>'",
    ]);
  const dbName = resolveDb(args);
  const doc = parseJsonFlag(args, "--doc", {
    required: true,
    example: '{"name":"Ada","status":"active"}',
  });
  const docs = Array.isArray(doc) ? doc : [doc];
  if (!docs.length || !docs.every(isPlainObject)) {
    throw new AxiError("--doc must be a JSON object, or a JSON array of JSON objects", "VALIDATION_ERROR", [
      `Example: --doc '{"name":"Ada"}'`,
      `Or bulk: --doc '[{"name":"Ada"},{"name":"Grace"}]'`,
    ]);
  }

  if (!hasFlag(args, "--confirm")) {
    return renderOutput([
      "dry_run: yes",
      `collection: ${collection} (db ${dbName})`,
      `would_insert: ${docs.length} document${docs.length === 1 ? "" : "s"}`,
      renderObject({ doc: docs.length === 1 ? docs[0] : docs }),
      renderHelp(["Re-run with --confirm to actually insert"]),
    ]);
  }

  const result = await withClient((client) => {
    const coll = client.db(dbName).collection(collection);
    return docs.length === 1 ? coll.insertOne(docs[0]) : coll.insertMany(docs);
  });

  const insertedIds =
    "insertedId" in result
      ? [String(result.insertedId)]
      : Object.values(result.insertedIds || {}).map(String);

  return renderOutput(["inserted: yes", `count: ${insertedIds.length}`, renderObject({ insertedIds })]);
}
