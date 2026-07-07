import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { homeCommand } from "./commands/home.js";
import { searchCommand, SEARCH_HELP } from "./commands/search.js";
import { channelsCommand } from "./commands/channels.js";
import { readCommand, threadCommand } from "./commands/messages.js";
import { catchupCommand, CATCHUP_HELP } from "./commands/catchup.js";
import { sendCommand, SEND_HELP } from "./commands/send.js";
import { authCommand, AUTH_HELP } from "./auth.js";
import { skillCommand, SKILL_HELP } from "./skill.js";

export const DESCRIPTION =
  "Agent-ergonomic wrapper around the Slack Web API. Prefer this over the Slack MCP for search / read / post.";

export const TOP_HELP = `usage: slack-axi [command] [args] [flags]
commands[9]:
  (none)=whoami, search, channels, read, thread, catchup, send, auth, skill
flags:
  --help, -v/-V/--version
examples:
  slack-axi
  slack-axi search "deploy failed"
  slack-axi channels
  slack-axi read #general
  slack-axi thread #general 1782872886.854179
  slack-axi send #general --text "..." --confirm
`;

const COMMAND_HELP = { search: SEARCH_HELP, catchup: CATCHUP_HELP, send: SEND_HELP, auth: AUTH_HELP, skill: SKILL_HELP };

const META = {
  tool: "slack-axi",
  tokenPath: join(homedir(), ".config", "slack-axi", "token"),
  hint: "Create a Slack app with user-token scopes, install it, and paste the User OAuth Token (xoxp-…)",
  subject: "Slack",
  topHelp: TOP_HELP,
  description: DESCRIPTION,
};

const COMMANDS = {
  search: (args) => searchCommand(args),
  channels: (args) => channelsCommand(args),
  read: (args) => readCommand(args),
  thread: (args) => threadCommand(args),
  catchup: (args) => catchupCommand(args),
  send: (args) => sendCommand(args),
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
