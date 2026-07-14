// No credential here — Chrome's debug port has no token. "auth" instead means
// "point at a debug port and confirm it answers", kept as `auth` for the same
// dispatch shape every other AXI tool uses (skill.js and cli.js expect it).
import { unlinkSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { AxiError } from "./errors.js";
import { renderOutput, renderHelp } from "./toon.js";
import { getFlag } from "./args.js";
import { getBrowserURL, writeConfig } from "./client.js";

const CONFIG_PATH = join(homedir(), ".config", "chrome-devtools-axi", "config.json");

export const AUTH_HELP = `usage: auth <login|logout>
  login    check connectivity to a Chrome debug port and remember it
           --browser-url <url> (default: http://localhost:9222, or
           $CHROME_DEVTOOLS_AXI_URL)
  logout   forget the configured debug port (falls back to the default)`;

export async function authCommand(args) {
  const sub = args[0];
  if (sub === "logout") {
    if (existsSync(CONFIG_PATH)) unlinkSync(CONFIG_PATH);
    return renderOutput([`logged out: removed ${CONFIG_PATH.replace(homedir(), "~")}`]);
  }
  if (sub && sub !== "login") {
    throw new AxiError(`Unknown auth subcommand: ${sub}`, "VALIDATION_ERROR", ["Use: auth login | auth logout"]);
  }
  const browserURL = getFlag(args, "--browser-url") || getBrowserURL();
  let info;
  try {
    const res = await fetch(`${browserURL}/json/version`);
    info = await res.json();
  } catch (err) {
    throw new AxiError(`Can't reach Chrome at ${browserURL}: ${err?.message ?? err}`, "AUTH", [
      "Make sure Chrome/Chromium is running with --remote-debugging-port on that port",
    ]);
  }
  writeConfig({ browserURL });
  return renderOutput([
    `connected: ${browserURL}`,
    `browser: ${info.Browser ?? "unknown"}`,
    renderHelp(["Run `chrome-devtools-axi session start` to open a tracked tab"]),
  ]);
}
