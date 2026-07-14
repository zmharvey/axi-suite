import { withClient, resolveDb, toPlainDoc } from "../client.js";
import { AxiError } from "../errors.js";
import { getFlag, getPositional } from "../args.js";
import { parseJsonFlag } from "../json-arg.js";
import { renderOutput, renderHelp, renderList, countLine, field } from "../toon.js";

export const FIND_HELP = `usage: mongo-axi find <collection> --db <name> [flags]
Read documents from a collection.
flags:
  --filter '<json>'    MongoDB query filter (default: {} — all documents)
  --limit <n>          default 20
  --fields a,b,c       comma-separated projection (default: all fields found)
examples:
  mongo-axi find users --db shop
  mongo-axi find users --db shop --filter '{"status":"active"}' --limit 5
  mongo-axi find orders --db shop --filter '{"total":{"$gt":100}}' --fields _id,total,status`;

/** Build a Mongo projection + the field order to render, from --fields. */
function buildProjection(fieldsFlag) {
  if (!fieldsFlag) return { projection: undefined, keys: undefined };
  const keys = fieldsFlag
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!keys.length) return { projection: undefined, keys: undefined };
  const projection = { _id: keys.includes("_id") ? 1 : 0 };
  for (const k of keys) projection[k] = 1;
  return { projection, keys };
}

/** When no --fields was given, render whatever keys actually came back. */
function unionKeys(docs) {
  const seen = new Set();
  for (const d of docs) for (const k of Object.keys(d)) seen.add(k);
  const keys = Array.from(seen);
  return keys.includes("_id") ? ["_id", ...keys.filter((k) => k !== "_id")] : keys;
}

export async function findCommand(args) {
  const collection = getPositional(args, 0);
  if (!collection)
    throw new AxiError("Missing <collection>", "VALIDATION_ERROR", [
      "Usage: mongo-axi find <collection> --db <name>",
    ]);
  const dbName = resolveDb(args);
  const filter = parseJsonFlag(args, "--filter", { example: '{"status":"active"}' }) || {};
  const limit = Number(getFlag(args, "--limit")) || 20;
  const { projection, keys: fieldKeys } = buildProjection(getFlag(args, "--fields"));

  const docs = await withClient((client) =>
    client.db(dbName).collection(collection).find(filter, { projection }).limit(limit).toArray(),
  );

  const plain = docs.map(toPlainDoc);
  const keys = fieldKeys || unionKeys(plain);
  const schema = keys.map((k) => field(k));

  return renderOutput([
    countLine(plain.length, plain.length === limit ? `showing first ${limit}` : undefined),
    plain.length ? renderList("documents", plain, schema) : "documents: none",
    renderHelp([
      "Add `--filter '<json>'` to narrow results, `--fields a,b,c` to project specific fields",
      `Run \`mongo-axi count ${collection} --db ${dbName}\` for a total count`,
    ]),
  ]);
}
