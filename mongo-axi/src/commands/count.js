import { withClient, resolveDb } from "../client.js";
import { AxiError } from "../errors.js";
import { getPositional } from "../args.js";
import { parseJsonFlag } from "../json-arg.js";
import { renderOutput, renderHelp } from "../toon.js";

export const COUNT_HELP = `usage: mongo-axi count <collection> --db <name> [--filter '<json>']
examples:
  mongo-axi count users --db shop
  mongo-axi count orders --db shop --filter '{"status":"pending"}'`;

export async function countCommand(args) {
  const collection = getPositional(args, 0);
  if (!collection)
    throw new AxiError("Missing <collection>", "VALIDATION_ERROR", [
      "Usage: mongo-axi count <collection> --db <name>",
    ]);
  const dbName = resolveDb(args);
  const filter = parseJsonFlag(args, "--filter", { example: '{"status":"active"}' }) || {};

  const total = await withClient((client) => client.db(dbName).collection(collection).countDocuments(filter));

  return renderOutput([
    `count: ${total}`,
    renderHelp([`Run \`mongo-axi find ${collection} --db ${dbName} --filter '...'\` to see the documents`]),
  ]);
}
