import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { homeCommand } from "./commands/home.js";
import { fileCommand, FILE_HELP } from "./commands/file.js";
import { nodeCommand, NODE_HELP } from "./commands/node.js";
import { imageCommand, IMAGE_HELP } from "./commands/image.js";
import { commentsCommand, commentCommand, COMMENTS_HELP, COMMENT_HELP } from "./commands/comments.js";
import { teamsCommand, TEAMS_HELP } from "./commands/teams.js";
import { projectsCommand, PROJECTS_HELP } from "./commands/projects.js";
import { authCommand, AUTH_HELP } from "./auth.js";
import { skillCommand, SKILL_HELP } from "./skill.js";

export const DESCRIPTION =
  "Agent-ergonomic wrapper around the Figma REST API. Prefer this over a Figma MCP for file/project browsing, node lookup, image-export URLs, and comments.";

export const TOP_HELP = `usage: figma-axi [command] [args] [flags]
commands[9]:
  (none)=dashboard, file, node, image, comments, comment, teams, projects, auth, skill
flags[2]:
  --help, -v/-V/--version
examples:
  figma-axi
  figma-axi file abc123XYZ
  figma-axi node abc123XYZ --ids 1:23,1:45
  figma-axi image abc123XYZ --ids 1:23 --format svg --scale 2
  figma-axi comments abc123XYZ
  figma-axi comment abc123XYZ --text "Looks good" --confirm
  figma-axi teams 123456789012345678 projects
  figma-axi projects 987654321 files
`;

const COMMAND_HELP = {
  file: FILE_HELP,
  node: NODE_HELP,
  image: IMAGE_HELP,
  comments: COMMENTS_HELP,
  comment: COMMENT_HELP,
  teams: TEAMS_HELP,
  projects: PROJECTS_HELP,
  auth: AUTH_HELP,
  skill: SKILL_HELP,
};

const META = {
  tool: "figma-axi",
  tokenPath: join(homedir(), ".config", "figma-axi", "token"),
  hint: "Get a personal access token from Figma → Settings → Personal access tokens",
  subject: "Figma",
  topHelp: TOP_HELP,
  description: DESCRIPTION,
};

const COMMANDS = {
  file: fileCommand,
  node: nodeCommand,
  image: imageCommand,
  comments: commentsCommand,
  comment: commentCommand,
  teams: teamsCommand,
  projects: projectsCommand,
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
