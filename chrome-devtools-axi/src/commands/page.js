import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getFlag, getPositional, hasFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { renderOutput, renderHelp } from "../toon.js";
import { withPage } from "../client.js";

export const NAVIGATE_HELP = `usage: chrome-devtools-axi navigate <url>
Navigates the tracked tab and waits for load.
example: chrome-devtools-axi navigate https://example.com`;

export const SCREENSHOT_HELP = `usage: chrome-devtools-axi screenshot [flags]
flags: --out <path> (default: ./screenshot.png), --full-page
example: chrome-devtools-axi screenshot --out ./out.png --full-page`;

export const CONTENT_HELP = `usage: chrome-devtools-axi content [--selector <css>]
Returns visible text content of the page, or of a specific element.
example: chrome-devtools-axi content --selector "main"`;

export async function navigateCommand(args) {
  const url = getPositional(args, 0);
  if (!url) throw new AxiError("Missing url", "VALIDATION_ERROR", ["Usage: chrome-devtools-axi navigate <url>"]);
  return withPage(async (page) => {
    await page.goto(url, { waitUntil: "load" });
    return renderOutput(["navigated: yes", `url: ${page.url()}`, `title: ${await page.title()}`]);
  });
}

export async function screenshotCommand(args) {
  const outPath = resolve(getFlag(args, "--out") || "./screenshot.png");
  const fullPage = hasFlag(args, "--full-page");
  return withPage(async (page) => {
    const buf = await page.screenshot({ fullPage });
    writeFileSync(outPath, buf);
    return renderOutput([
      "saved: yes",
      `path: ${outPath}`,
      `fullPage: ${fullPage ? "yes" : "no"}`,
      renderHelp(["Read the file directly to view it"]),
    ]);
  });
}

export async function contentCommand(args) {
  const selector = getFlag(args, "--selector");
  return withPage(async (page) => {
    const text = selector
      ? await page.$eval(selector, (el) => el.innerText).catch(() => {
          throw new AxiError(`No element matched selector: ${selector}`, "NOT_FOUND");
        })
      : await page.evaluate(() => document.body.innerText);
    return renderOutput([`length: ${text.length}`, text]);
  });
}
