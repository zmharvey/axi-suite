import { withClient, resolveDb } from "../client.js";
import { AxiError } from "../errors.js";
import { getPositional, hasFlag } from "../args.js";
import { parseJsonFlag } from "../json-arg.js";
import { renderOutput, renderHelp, renderObject } from "../toon.js";

export const UPDATE_HELP = `usage: mongo-axi update <collection> --db <name> --filter '<json>' --set '<json>' [--confirm]
Sets fields on every document matching --filter, via MongoDB's $set. This
only supports a flat field-set — NOT arbitrary update operators like
$inc/$push/$unset. DRAFT-FIRST: without --confirm this only shows what would
change, and how many documents currently match.
examples:
  mongo-axi update users --db shop --filter '{"_id":"..."}' --set '{"status":"inactive"}'           # dry-run
  mongo-axi update users --db shop --filter '{"_id":"..."}' --set '{"status":"inactive"}' --confirm  # applies`;

function isFlatObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export async function updateCommand(args) {
  const collection = getPositional(args, 0);
  if (!collection)
    throw new AxiError("Missing <collection>", "VALIDATION_ERROR", [
      "Usage: mongo-axi update <collection> --db <name> --filter '<json>' --set '<json>'",
    ]);
  const dbName = resolveDb(args);
  const filter = parseJsonFlag(args, "--filter", {
    required: true,
    example: '{"status":"active"}',
  });
  const set = parseJsonFlag(args, "--set", {
    required: true,
    example: '{"status":"inactive"}',
  });
  if (!isFlatObject(set)) {
    throw new AxiError("--set must be a JSON object of fields to set", "VALIDATION_ERROR", [
      `Example: --set '{"status":"inactive"}'`,
      "Update operators ($inc, $push, $unset, ...) aren't supported — only a plain $set",
    ]);
  }

  const matchCount = await withClient((client) =>
    client.db(dbName).collection(collection).countDocuments(filter),
  );

  if (!hasFlag(args, "--confirm")) {
    return renderOutput([
      "dry_run: yes",
      `collection: ${collection} (db ${dbName})`,
      `matches: ${matchCount} document${matchCount === 1 ? "" : "s"}`,
      renderObject({ filter, update: { $set: set } }),
      renderHelp(["Re-run with --confirm to apply this to every matching document"]),
    ]);
  }

  const result = await withClient((client) =>
    client.db(dbName).collection(collection).updateMany(filter, { $set: set }),
  );

  return renderOutput([
    "updated: yes",
    `matched: ${result.matchedCount}`,
    `modified: ${result.modifiedCount}`,
  ]);
}
