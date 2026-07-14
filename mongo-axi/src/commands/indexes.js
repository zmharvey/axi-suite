import { withClient, resolveDb } from "../client.js";
import { AxiError } from "../errors.js";
import { getPositional } from "../args.js";
import { renderOutput, renderHelp, renderList, countLine, custom, field } from "../toon.js";

export const INDEXES_HELP = `usage: mongo-axi indexes <collection> --db <name>
List indexes defined on a collection.
examples:
  mongo-axi indexes users --db shop`;

const indexSchema = [
  field("name"),
  custom("keys", (i) => JSON.stringify(i.key)),
  custom("unique", (i) => (i.unique ? "yes" : "no")),
];

export async function indexesCommand(args) {
  const collection = getPositional(args, 0);
  if (!collection)
    throw new AxiError("Missing <collection>", "VALIDATION_ERROR", [
      "Usage: mongo-axi indexes <collection> --db <name>",
    ]);
  const dbName = resolveDb(args);
  const indexes = await withClient((client) => client.db(dbName).collection(collection).indexes());

  return renderOutput([
    countLine(indexes.length),
    indexes.length ? renderList("indexes", indexes, indexSchema) : "indexes: none",
    renderHelp(["This tool only lists indexes — create/drop them via the Mongo shell, Compass, or Atlas"]),
  ]);
}
