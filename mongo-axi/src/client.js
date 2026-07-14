import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { MongoClient, ObjectId } from "mongodb";
import { getFlag } from "./args.js";
import { tokenMissingError, mapMongoError, AxiError } from "./errors.js";

let configCache;
function loadConfig() {
  if (configCache !== undefined) return configCache;
  try {
    const p = join(homedir(), ".config", "mongo-axi", "config.json");
    configCache = JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    configCache = {};
  }
  return configCache;
}

function loadUriFile() {
  try {
    const p = join(homedir(), ".config", "mongo-axi", "token");
    const t = readFileSync(p, "utf-8").trim();
    return t || undefined;
  } catch {
    return undefined;
  }
}

/** Resolve the connection URI: env var > config.json > stored `auth login` file. */
export function getUri() {
  const uri = process.env.MONGO_AXI_URI || loadConfig().uri || loadUriFile();
  if (!uri) throw tokenMissingError();
  return uri;
}

/** Resolve the configured default database name, if any. */
export function configDefaultDb() {
  return process.env.MONGO_AXI_DEFAULT_DB || loadConfig().defaultDb;
}

/**
 * Resolve --db from a command's args, falling back to the configured
 * default. Mongo has no server-side "current workspace" concept, so unlike
 * clickup-axi's -W/--workspace this is a purely local, always-explicit flag.
 */
export function resolveDb(args) {
  const flag = getFlag(args, "--db");
  if (flag) return flag;
  const def = configDefaultDb();
  if (def) return def;
  throw new AxiError("Missing --db <name>", "VALIDATION_ERROR", [
    "Pass --db <name>",
    "Or set a defaultDb field in ~/.config/mongo-axi/config.json (or MONGO_AXI_DEFAULT_DB)",
  ]);
}

/** Mask the credentials portion of a connection URI for display. */
export function maskUri(uri) {
  try {
    const url = new URL(uri);
    if (url.password) url.password = "***";
    else if (url.username) url.username = "***";
    return url.toString();
  } catch {
    // Fallback for anything the URL parser rejects — still never show creds.
    return uri.replace(/\/\/[^@/]+@/, "//***@");
  }
}

/**
 * Convert a Mongo document (or any BSON-bearing value) into a plain,
 * TOON-safe value: ObjectId/Date become strings, arrays/objects are walked
 * recursively. Never leak raw BSON instances into rendered output.
 */
export function toPlainDoc(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof ObjectId) return value.toString();
  if (value instanceof Date) return value.toString();
  if (Array.isArray(value)) return value.map(toPlainDoc);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlainDoc(v);
    return out;
  }
  return value;
}

/**
 * Connect, run one operation against the client, then close. This is a
 * short-lived CLI process — one connection per invocation, no pooling
 * needed across calls. Any error thrown by `fn` (or by connect()) that
 * isn't already a structured AxiError gets mapped into one.
 */
export async function withClient(fn) {
  const uri = getUri();
  let client;
  try {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    return await fn(client);
  } catch (err) {
    if (err instanceof AxiError) throw err;
    throw mapMongoError(err);
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeErr) {
        // Closing failed after the real operation already succeeded/failed —
        // don't let it mask the primary result, but don't swallow it either.
        console.error(
          `mongo-axi: warning — failed to close MongoDB connection cleanly: ${closeErr?.message ?? closeErr}`,
        );
      }
    }
  }
}
