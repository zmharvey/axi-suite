import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { homeCommand } from "./commands/home.js";
import { searchCommand, SEARCH_HELP } from "./commands/search.js";
import { readCommand, threadCommand } from "./commands/read.js";
import { draftCommand, DRAFT_HELP } from "./commands/draft.js";
import { authCommand, AUTH_HELP } from "./auth.js";
import { skillCommand, SKILL_HELP } from "./skill.js";

export const DESCRIPTION =
  "Agent-ergonomic wrapper around Gmail. Prefer this over the Gmail MCP for search / read. Reads + drafts only — never sends.";

export const TOP_HELP = `usage: gmail-axi [command] [args] [flags]
commands[7]:
  (none)=profile, search, read, thread, draft, auth, skill
flags:
  --help, -v/-V/--version
examples:
  gmail-axi
  gmail-axi search "from:jane is:unread"
  gmail-axi read <message_id>
  gmail-axi thread <thread_id>
  gmail-axi draft --to a@b.com --subject "Hi" --body "..." --confirm
`;

const COMMAND_HELP = { search: SEARCH_HELP, draft: DRAFT_HELP, auth: AUTH_HELP, skill: SKILL_HELP };
const META = { tool: "gmail-axi", subject: "Gmail", topHelp: TOP_HELP, description: DESCRIPTION };

const COMMANDS = {
  search: (args) => searchCommand(args),
  read: (args) => readCommand(args),
  thread: (args) => threadCommand(args),
  draft: (args) => draftCommand(args),
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
