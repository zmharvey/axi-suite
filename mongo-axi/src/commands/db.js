import { withClient } from "../client.js";
import { AxiError } from "../errors.js";
import { renderOutput, renderHelp, renderList, countLine, field } from "../toon.js";

export const DB_HELP = `usage: mongo-axi db <list>
subcommands[1]:
  list    list database names on the connected server (default)
examples:
  mongo-axi db list`;

const dbSchema = [field("name"), field("sizeOnDisk"), field("empty")];

async function dbList() {
  const dbs = await withClient(async (client) => {
    const res = await client.db().admin().listDatabases();
    return res.databases || [];
  });
  return renderOutput([
    countLine(dbs.length),
    dbs.length ? renderList("databases", dbs, dbSchema) : "databases: none",
    renderHelp(["Run `mongo-axi collections list --db <name>` to see collections in one"]),
  ]);
}

export async function dbCommand(args) {
  const sub = args[0];
  switch (sub) {
    case "list":
    case undefined:
      return dbList();
    default:
      throw new AxiError(`Unknown db subcommand: ${sub}`, "VALIDATION_ERROR", ["Subcommands: list"]);
  }
}
