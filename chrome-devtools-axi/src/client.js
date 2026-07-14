// Connects to an already-running Chrome via its remote-debugging port (the
// tool never launches or owns a browser — it drives whatever's already there,
// e.g. a headless Chromium started for local QA). A CLI invocation is a fresh
// process each time, so "the current session" is tracked across invocations
// by the target's real CDP targetId (Target.getTargetInfo — a documented
// protocol command, not a private puppeteer field), stored on disk.
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import puppeteer from "puppeteer-core";
import { sessionMissingError, connectError, AxiError } from "./errors.js";

const CONFIG_DIR = join(homedir(), ".config", "chrome-devtools-axi");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const SESSION_PATH = join(CONFIG_DIR, "session.json");
const DEFAULT_BROWSER_URL = "http://localhost:9222";

function loadConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}

export function getBrowserURL() {
  return process.env.CHROME_DEVTOOLS_AXI_URL || loadConfig().browserURL || DEFAULT_BROWSER_URL;
}

export function writeConfig(config) {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export function readSession() {
  try {
    return JSON.parse(readFileSync(SESSION_PATH, "utf-8"));
  } catch {
    return undefined;
  }
}

export function writeSession(session) {
  mkdirSync(dirname(SESSION_PATH), { recursive: true });
  writeFileSync(SESSION_PATH, JSON.stringify(session, null, 2), { mode: 0o600 });
}

export function clearSession() {
  if (existsSync(SESSION_PATH)) unlinkSync(SESSION_PATH);
}

/** Connect to the configured debug port. Caller must browser.disconnect() — never browser.close(), the browser isn't ours. */
export async function connectBrowser(browserURL = getBrowserURL()) {
  try {
    return await puppeteer.connect({ browserURL, defaultViewport: null });
  } catch (err) {
    throw connectError(browserURL, err?.message ?? String(err));
  }
}

/** Read a page's real CDP targetId via the documented Target.getTargetInfo command. */
async function targetIdOf(page) {
  const cdp = await page.createCDPSession();
  try {
    const { targetInfo } = await cdp.send("Target.getTargetInfo");
    return targetInfo.targetId;
  } finally {
    await cdp.detach();
  }
}

/** Find the page matching the tracked session's targetId among all open pages. */
async function findTrackedPage(browser, targetId) {
  for (const page of await browser.pages()) {
    if ((await targetIdOf(page)) === targetId) return page;
  }
  return undefined;
}

/**
 * Run fn(page) against the tracked session's page. Handles connect + lookup +
 * disconnect (never closes the shared browser). Throws sessionMissingError if
 * no session is tracked or the tracked tab was closed elsewhere.
 */
export async function withPage(fn) {
  const session = readSession();
  if (!session) throw sessionMissingError();
  const browser = await connectBrowser(session.browserURL);
  try {
    const page = await findTrackedPage(browser, session.targetId);
    if (!page) {
      clearSession();
      throw new AxiError("Tracked browser tab was closed", "NOT_FOUND", [
        "Run `chrome-devtools-axi session start` to open a new one",
      ]);
    }
    return await fn(page);
  } finally {
    await browser.disconnect();
  }
}

export { targetIdOf };
