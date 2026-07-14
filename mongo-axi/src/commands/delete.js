import { withClient, resolveDb } from "../client.js";
import { AxiError } from "../errors.js";
import { getPositional, hasFlag } from "../args.js";
import { parseJsonFlag } from "../json-arg.js";
import { renderOutput, renderHelp } from "../toon.js";

export const DELETE_HELP = `usage: mongo-axi delete <collection> --db <name> --filter '<json>' [--confirm]
Deletes every document matching --filter. An empty filter is refused (it
would match the whole collection). DRAFT-FIRST: without --confirm this only
shows how many documents currently match.
examples:
  mongo-axi delete sessions --db shop --filter '{"expired":true}'            # dry-run
  mongo-axi delete sessions --db shop --filter '{"expired":true}' --confirm  # deletes`;

export async function deleteCommand(args) {
  const collection = getPositional(args, 0);
  if (!collection)
    throw new AxiError("Missing <collection>", "VALIDATION_ERROR", [
      "Usage: mongo-axi delete <collection> --db <name> --filter '<json>'",
    ]);
  const dbName = resolveDb(args);
  const filter = parseJsonFlag(args, "--filter", {
    required: true,
    example: '{"status":"inactive"}',
  });
  if (!filter || typeof filter !== "object" || Array.isArray(filter) || Object.keys(filter).length === 0) {
    throw new AxiError(
      "Refusing to delete with an empty filter (it would match every document)",
      "VALIDATION_ERROR",
      ["Pass a --filter that narrows to the documents you actually want removed"],
    );
  }

  const matchCount = await withClient((client) =>
    client.db(dbName).collection(collection).countDocuments(filter),
  );

  if (!hasFlag(args, "--confirm")) {
    return renderOutput([
      "dry_run: yes",
      `collection: ${collection} (db ${dbName})`,
      `would_delete: ${matchCount} document${matchCount === 1 ? "" : "s"}`,
      `filter: ${JSON.stringify(filter)}`,
      renderHelp(["Re-run with --confirm to actually delete"]),
    ]);
  }

  const result = await withClient((client) => client.db(dbName).collection(collection).deleteMany(filter));

  return renderOutput(["deleted: yes", `count: ${result.deletedCount}`]);
}
