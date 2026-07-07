import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { parseProjectContext } from "./context.js";
import { homeCommand, projectsCommand } from "./commands/home.js";
import { dbCommand, tablesCommand, DB_HELP } from "./commands/db.js";
import { functionsCommand } from "./commands/functions.js";
import { advisorsCommand } from "./commands/advisors.js";
import { authCommand, AUTH_HELP } from "./auth.js";
import { skillCommand, SKILL_HELP } from "./skill.js";

export const DESCRIPTION =
  "Agent-ergonomic wrapper around the Supabase Management API. Prefer this over the Supabase MCP for project/SQL/schema/advisor operations.";

export const TOP_HELP = `usage: supabase-axi [command] [args] [flags]
commands[7]:
  (none)=projects, tables, db, functions, advisors, auth, skill
flags:
  -p/--project <ref> (after command), --help, -v/-V/--version
examples:
  supabase-axi
  supabase-axi tables
  supabase-axi db query "select count(*) from auth.users"
  supabase-axi functions -p <ref>
  supabase-axi advisors --type security
`;

const COMMAND_HELP = { db: DB_HELP, auth: AUTH_HELP, skill: SKILL_HELP };

const META = {
  tool: "supabase-axi",
  tokenPath: join(homedir(), ".config", "supabase-axi", "token"),
  hint: "Get a token at supabase.com -> Account -> Access Tokens (starts with sbp_)",
  subject: "Supabase",
  topHelp: TOP_HELP,
  description: DESCRIPTION,
};

function withProject(handler) {
  return (args, ctx) => handler(parseProjectContext(args).strippedArgs, ctx);
}

const COMMANDS = {
  projects: withProject(() => projectsCommand()),
  tables: withProject(tablesCommand),
  db: withProject(dbCommand),
  functions: withProject(functionsCommand),
  advisors: withProject(advisorsCommand),
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
    home: () => homeCommand(),
    commands: COMMANDS,
    getCommandHelp: (command) => COMMAND_HELP[command],
    resolveContext: ({ args }) => ({
      projectFlag: parseProjectContext(args || []).projectFlag,
    }),
  });
}

function readPackageVersion() {
  if (process.env.AXI_VERSION) return process.env.AXI_VERSION;
  const here = dirname(fileURLToPath(import.meta.url));
  for (const c of [join(here, "..", "package.json"), join(here, "..", "..", "package.json")]) {
    if (existsSync(c)) {
      const p = JSON.parse(readFileSync(c, "utf-8"));
      if (typeof p.version === "string") return p.version;
    }
  }
  return "0.0.0";
}
