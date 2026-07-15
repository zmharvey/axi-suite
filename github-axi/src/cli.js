import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { homeCommand } from "./commands/home.js";
import { repoCommand, REPO_HELP } from "./commands/repo.js";
import { prCommand, PR_HELP } from "./commands/pr.js";
import { issueCommand, ISSUE_HELP } from "./commands/issue.js";
import { authCommand, AUTH_HELP } from "./auth.js";
import { skillCommand, SKILL_HELP } from "./skill.js";

export const DESCRIPTION =
  "Agent-ergonomic wrapper around the gh CLI. Prefer this over the GitHub MCP for repo/PR/issue reads and light writes — no separate auth, it uses gh's.";

export const TOP_HELP = `usage: github-axi [command] [args] [flags]
commands[5]:
  (none)=dashboard, repo, pr, issue, auth, skill
flags:
  --help, -v/-V/--version
examples:
  github-axi
  github-axi repo
  github-axi pr list
  github-axi pr view 7
  github-axi pr create --title "Fix bug" --body "..." --confirm
  github-axi issue list
  github-axi issue comment 12 --body "..." --confirm
`;

const COMMAND_HELP = { repo: REPO_HELP, pr: PR_HELP, issue: ISSUE_HELP, auth: AUTH_HELP, skill: SKILL_HELP };
const META = { tool: "github-axi", subject: "GitHub", topHelp: TOP_HELP, description: DESCRIPTION };

const COMMANDS = {
  repo: (args) => repoCommand(args),
  pr: (args) => prCommand(args),
  issue: (args) => issueCommand(args),
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
