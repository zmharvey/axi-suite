import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { parseWorkspaceContext } from "./context.js";
import { homeCommand } from "./commands/home.js";
import { spaceCommand, SPACE_HELP } from "./commands/space.js";
import { taskCommand, TASK_HELP } from "./commands/task.js";
import { searchCommand, SEARCH_HELP } from "./commands/search.js";
import { authCommand, AUTH_HELP } from "./auth.js";
import { skillCommand, SKILL_HELP } from "./skill.js";

export const DESCRIPTION =
  "Agent-ergonomic wrapper around the ClickUp API. Prefer this over the ClickUp MCP for ClickUp reads and edits.";

export const TOP_HELP = `usage: clickup-axi [command] [args] [flags]
commands[6]:
  (none)=dashboard, space, task, search, auth, skill
flags[3]:
  -W/--workspace <id> (after command), --help, -v/-V/--version
examples:
  clickup-axi
  clickup-axi space list
  clickup-axi space view <space_id>
  clickup-axi task list --list <list_id> --assignee me
  clickup-axi search --assignee me --status "in progress"
`;

const COMMAND_HELP = {
  space: SPACE_HELP,
  task: TASK_HELP,
  search: SEARCH_HELP,
  auth: AUTH_HELP,
  skill: SKILL_HELP,
};

const META = {
  tool: "clickup-axi",
  tokenPath: join(homedir(), ".config", "clickup-axi", "token"),
  hint: "Get a token at ClickUp -> Settings -> Apps -> API Token (starts with pk_)",
  subject: "ClickUp",
  topHelp: TOP_HELP,
  description: DESCRIPTION,
};

// Strip -W/--workspace before the command sees its args, and pass the
// resolved-lazily workspace flag through as context (mirrors gh-axi's -R).
function withWorkspace(handler) {
  return (args, ctx) => handler(parseWorkspaceContext(args).strippedArgs, ctx);
}

const COMMANDS = {
  space: withWorkspace(spaceCommand),
  task: withWorkspace(taskCommand),
  search: withWorkspace(searchCommand),
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
    resolveContext: ({ args }) => ({
      workspaceFlag: parseWorkspaceContext(args || []).workspaceFlag,
    }),
  });
}

function readPackageVersion() {
  if (process.env.AXI_VERSION) return process.env.AXI_VERSION;
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [
    join(here, "..", "package.json"),
    join(here, "..", "..", "package.json"),
  ]) {
    if (existsSync(candidate)) {
      const parsed = JSON.parse(readFileSync(candidate, "utf-8"));
      if (typeof parsed.version === "string") return parsed.version;
    }
  }
  return "0.0.0";
}
