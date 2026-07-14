import { getFlag } from "../args.js";
import { AxiError, sessionMissingError } from "../errors.js";
import { renderOutput, renderHelp, relMs } from "../toon.js";
import { connectBrowser, getBrowserURL, readSession, writeSession, clearSession, withPage, targetIdOf } from "../client.js";

export const SESSION_HELP = `usage: chrome-devtools-axi session <start|stop|status> [flags]
subcommands[3]:
  start    open a new tab on the debug port and track it for future commands
  stop     close the tracked tab and forget it
  status   show what's currently tracked
flags{start}:
  --url <url>            navigate the new tab here immediately
  --browser-url <url>    debug port to use (default: configured / http://localhost:9222)
examples:
  chrome-devtools-axi session start --url https://example.com
  chrome-devtools-axi session status
  chrome-devtools-axi session stop`;

async function sessionStart(args) {
  const browserURL = getFlag(args, "--browser-url") || getBrowserURL();
  const url = getFlag(args, "--url");
  const browser = await connectBrowser(browserURL);
  try {
    const page = await browser.newPage();
    if (url) await page.goto(url, { waitUntil: "load" });
    const targetId = await targetIdOf(page);
    writeSession({ targetId, browserURL, startedAt: Date.now() });
    return renderOutput([
      "started: yes",
      `browser: ${browserURL}`,
      `url: ${page.url()}`,
      renderHelp(["Run `chrome-devtools-axi navigate <url>` or `screenshot` next"]),
    ]);
  } finally {
    await browser.disconnect();
  }
}

async function sessionStop() {
  const session = readSession();
  if (!session) throw sessionMissingError();
  const browser = await connectBrowser(session.browserURL);
  try {
    for (const page of await browser.pages()) {
      if ((await targetIdOf(page)) === session.targetId) {
        await page.close();
        clearSession();
        return renderOutput(["stopped: yes"]);
      }
    }
    clearSession();
    return renderOutput(["stopped: yes", "note: tab was already closed"]);
  } finally {
    await browser.disconnect();
  }
}

async function sessionStatus() {
  const session = readSession();
  if (!session) {
    return renderOutput(["active: no", renderHelp(["Run `chrome-devtools-axi session start` to open one"])]);
  }
  try {
    return await withPage(async (page) =>
      renderOutput([
        "active: yes",
        `browser: ${session.browserURL}`,
        `url: ${page.url()}`,
        `title: ${await page.title()}`,
        `started: ${relMs(session.startedAt)}`,
      ]),
    );
  } catch (err) {
    if (err instanceof AxiError && err.code === "NOT_FOUND") {
      return renderOutput(["active: no", "note: previously tracked tab is gone"]);
    }
    throw err;
  }
}

export async function sessionCommand(args) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "start":
      return sessionStart(rest);
    case "stop":
      return sessionStop();
    case "status":
    case undefined:
      return sessionStatus();
    default:
      throw new AxiError(`Unknown session subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Subcommands: start, stop, status",
      ]);
  }
}
