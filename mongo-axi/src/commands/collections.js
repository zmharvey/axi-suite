import { withClient, resolveDb } from "../client.js";
import { AxiError } from "../errors.js";
import { renderOutput, renderHelp, renderList, countLine, field } from "../toon.js";

export const COLLECTIONS_HELP = `usage: mongo-axi collections <list> --db <name>
subcommands[1]:
  list    list collection names in the database (default)
flags:
  --db <name> (required, or set defaultDb in config)
examples:
  mongo-axi collections list --db shop`;

const collSchema = [field("name"), field("type")];

async function collectionsList(args) {
  const dbName = resolveDb(args);
  const cols = await withClient((client) => client.db(dbName).listCollections().toArray());
  return renderOutput([
    countLine(cols.length),
    cols.length ? renderList("collections", cols, collSchema) : "collections: none",
    renderHelp([`Run \`mongo-axi find <collection> --db ${dbName}\` to read documents`]),
  ]);
}

export async function collectionsCommand(args) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "list":
    case undefined:
      return collectionsList(rest);
    default:
      throw new AxiError(`Unknown collections subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Subcommands: list --db <name>",
      ]);
  }
}
