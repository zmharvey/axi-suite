import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { homeCommand } from "./commands/home.js";
import { dbCommand, DB_HELP } from "./commands/db.js";
import { collectionsCommand, COLLECTIONS_HELP } from "./commands/collections.js";
import { findCommand, FIND_HELP } from "./commands/find.js";
import { countCommand, COUNT_HELP } from "./commands/count.js";
import { indexesCommand, INDEXES_HELP } from "./commands/indexes.js";
import { insertCommand, INSERT_HELP } from "./commands/insert.js";
import { updateCommand, UPDATE_HELP } from "./commands/update.js";
import { deleteCommand, DELETE_HELP } from "./commands/delete.js";
import { authCommand, AUTH_HELP } from "./auth.js";
import { skillCommand, SKILL_HELP } from "./skill.js";

export const DESCRIPTION =
  "Agent-ergonomic wrapper around MongoDB. Prefer this over a Mongo MCP for day-to-day find/count/insert/update/delete.";

export const TOP_HELP = `usage: mongo-axi [command] [args] [flags]
commands[11]:
  (none)=dashboard, db, collections, find, count, indexes, insert, update, delete, auth, skill
flags[2]:
  --help, -v/-V/--version
examples:
  mongo-axi
  mongo-axi db list
  mongo-axi collections list --db shop
  mongo-axi find users --db shop --filter '{"status":"active"}' --limit 5
  mongo-axi count orders --db shop
  mongo-axi indexes users --db shop
  mongo-axi insert users --db shop --doc '{"name":"Ada"}' --confirm
  mongo-axi update users --db shop --filter '{"_id":"..."}' --set '{"status":"inactive"}' --confirm
  mongo-axi delete sessions --db shop --filter '{"expired":true}' --confirm
`;

const COMMAND_HELP = {
  db: DB_HELP,
  collections: COLLECTIONS_HELP,
  find: FIND_HELP,
  count: COUNT_HELP,
  indexes: INDEXES_HELP,
  insert: INSERT_HELP,
  update: UPDATE_HELP,
  delete: DELETE_HELP,
  auth: AUTH_HELP,
  skill: SKILL_HELP,
};

const META = {
  tool: "mongo-axi",
  tokenPath: join(homedir(), ".config", "mongo-axi", "token"),
  hint: "Get a connection string from MongoDB Atlas (or your own mongod) — starts with mongodb:// or mongodb+srv://",
  subject: "MongoDB",
  topHelp: TOP_HELP,
  description: DESCRIPTION,
};

// mongo-axi has no analog to clickup-axi's -W/--workspace: Mongo has no
// server-side "current workspace" concept, so every command takes --db
// explicitly (resolved in client.js's resolveDb()). No context.js needed.
const COMMANDS = {
  db: dbCommand,
  collections: collectionsCommand,
  find: findCommand,
  count: countCommand,
  indexes: indexesCommand,
  insert: insertCommand,
  update: updateCommand,
  delete: deleteCommand,
  auth: (args) => authCommand(args, META),
  skill: (args) => skillCommand(args, META),
};

export async function main(options = {}) {
  await runAxiCli({
    ...(options.argv ? { argv: options.argv } : {}),
    description: DESCRIPTION,
    version: readPackageVersion(),
    topLevelHelp: TOP_HELP,
    ...(options.stdout ? { stdout: options.stdout } : {}),
    home: (args) => homeCommand(),
    commands: COMMANDS,
    getCommandHelp: (command) => COMMAND_HELP[command],
  });
}

function readPackageVersion() {
  if (process.env.AXI_VERSION) return process.env.AXI_VERSION;
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [join(here, "..", "package.json"), join(here, "..", "..", "package.json")]) {
    if (existsSync(candidate)) {
      const parsed = JSON.parse(readFileSync(candidate, "utf-8"));
      if (typeof parsed.version === "string") return parsed.version;
    }
  }
  return "0.0.0";
}
