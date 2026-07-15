import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAxiCli } from "axi-sdk-js";
import { homeCommand } from "./commands/home.js";
import { calendarsCommand, CALENDARS_HELP } from "./commands/calendars.js";
import { eventsCommand, EVENTS_HELP } from "./commands/events.js";
import { authCommand, AUTH_HELP } from "./auth.js";
import { skillCommand, SKILL_HELP } from "./skill.js";

export const DESCRIPTION =
  "Agent-ergonomic wrapper around Google Calendar. Prefer this over the Calendar MCP for checking schedules and creating/deleting events.";

export const TOP_HELP = `usage: google-calendar-axi [command] [args] [flags]
commands[5]:
  (none)=today, calendars, events, auth, skill
flags:
  --help, -v/-V/--version
examples:
  google-calendar-axi
  google-calendar-axi calendars list
  google-calendar-axi events list --days 14
  google-calendar-axi events create --summary "Standup" --start 2026-07-15T09:00:00 --end 2026-07-15T09:15:00 --confirm
  google-calendar-axi events delete abc123 --confirm
`;

const COMMAND_HELP = { calendars: CALENDARS_HELP, events: EVENTS_HELP, auth: AUTH_HELP, skill: SKILL_HELP };
const META = { tool: "google-calendar-axi", subject: "Google Calendar", topHelp: TOP_HELP, description: DESCRIPTION };

const COMMANDS = {
  calendars: (args) => calendarsCommand(args),
  events: (args) => eventsCommand(args),
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
