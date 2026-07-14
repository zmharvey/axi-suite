import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { sessionCommand, SESSION_HELP } from "./commands/session.js";
import { navigateCommand, screenshotCommand, contentCommand, NAVIGATE_HELP, SCREENSHOT_HELP, CONTENT_HELP } from "./commands/page.js";
import { clickCommand, typeCommand, evalCommand, CLICK_HELP, TYPE_HELP, EVAL_HELP } from "./commands/interact.js";
import { authCommand, AUTH_HELP } from "./auth.js";
import { skillCommand, SKILL_HELP } from "./skill.js";
import { renderOutput, renderHelp } from "./toon.js";
import { readSession } from "./client.js";

export const DESCRIPTION =
  "Agent-ergonomic wrapper around a Chrome DevTools debug port. Prefer this over the chrome-devtools MCP for driving an already-running browser session.";

export const TOP_HELP = `usage: chrome-devtools-axi [command] [args] [flags]
commands[8]:
  (none)=dashboard, session, navigate, screenshot, content, click, type, eval,
  auth, skill
examples:
  chrome-devtools-axi session start --url https://example.com
  chrome-devtools-axi navigate https://example.com/login
  chrome-devtools-axi screenshot --out ./out.png
  chrome-devtools-axi click "button.submit"
  chrome-devtools-axi eval "document.title"
  chrome-devtools-axi session stop
`;

const COMMAND_HELP = {
  session: SESSION_HELP,
  navigate: NAVIGATE_HELP,
  screenshot: SCREENSHOT_HELP,
  content: CONTENT_HELP,
  click: CLICK_HELP,
  type: TYPE_HELP,
  eval: EVAL_HELP,
  auth: AUTH_HELP,
  skill: SKILL_HELP,
};

const META = {
  tool: "chrome-devtools-axi",
  subject: "browser",
  topHelp: TOP_HELP,
  description: DESCRIPTION,
};

const COMMANDS = {
  session: sessionCommand,
  navigate: navigateCommand,
  screenshot: screenshotCommand,
  content: contentCommand,
  click: clickCommand,
  type: typeCommand,
  eval: evalCommand,
  auth: authCommand,
  skill: (args) => skillCommand(args, META),
};

async function homeCommand() {
  const session = readSession();
  if (!session) {
    return renderOutput(["session: none", renderHelp(["Run `chrome-devtools-axi session start` to open one"])]);
  }
  return renderOutput([
    "session: active",
    `browser: ${session.browserURL}`,
    renderHelp(["Run `chrome-devtools-axi session status` for the current url/title"]),
  ]);
}

export async function main(options = {}) {
  await runAxiCli({
    ...(options.argv ? { argv: options.argv } : {}),
    description: DESCRIPTION,
    version: readPackageVersion(),
    topLevelHelp: TOP_HELP,
    ...(options.stdout ? { stdout: options.stdout } : {}),
    home: homeCommand,
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
