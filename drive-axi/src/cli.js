import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { homeCommand } from "./commands/home.js";
import { searchCommand } from "./commands/search.js";
import { lsCommand } from "./commands/ls.js";
import { readCommand } from "./commands/read.js";
import { authCommand, AUTH_HELP } from "./auth.js";
import { skillCommand, SKILL_HELP } from "./skill.js";

export const DESCRIPTION =
  "Agent-ergonomic wrapper around Google Drive (read-only). Prefer this over the Drive MCP for finding + reading files.";

export const TOP_HELP = `usage: drive-axi [command] [args] [flags]
commands[6]:
  (none)=recent, search, ls, read, auth, skill
flags:
  --help, -v/-V/--version
examples:
  drive-axi
  drive-axi search "website editor guide"
  drive-axi ls --folder <folder_id>
  drive-axi read <file_id>
`;

const COMMAND_HELP = { auth: AUTH_HELP, skill: SKILL_HELP };
const META = { tool: "drive-axi", subject: "Google Drive", topHelp: TOP_HELP, description: DESCRIPTION };

const COMMANDS = {
  search: (args) => searchCommand(args),
  ls: (args) => lsCommand(args),
  read: (args) => readCommand(args),
  auth: (args) => authCommand(args),
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
