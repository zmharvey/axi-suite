import { getFlag, getPositional } from "../args.js";
import { AxiError } from "../errors.js";
import { renderOutput } from "../toon.js";
import { withPage } from "../client.js";

export const CLICK_HELP = `usage: chrome-devtools-axi click <selector>
Clicks the first element matching a CSS selector on the tracked tab.
example: chrome-devtools-axi click "button.submit"`;

export const TYPE_HELP = `usage: chrome-devtools-axi type <selector> --text "..."
Types text into the first element matching a CSS selector (does not clear first).
example: chrome-devtools-axi type "#search" --text "hello world"`;

export const EVAL_HELP = `usage: chrome-devtools-axi eval <js-expression>
Evaluates a JS expression in the page context and prints the JSON-serializable
result. Runs directly against the live page — has the same side-effect
potential as typing it into the browser console.
example: chrome-devtools-axi eval "document.title"`;

async function clickOrThrow(page, selector) {
  try {
    await page.click(selector);
  } catch {
    throw new AxiError(`No clickable element matched selector: ${selector}`, "NOT_FOUND");
  }
}

export async function clickCommand(args) {
  const selector = getPositional(args, 0);
  if (!selector) throw new AxiError("Missing selector", "VALIDATION_ERROR", ["Usage: chrome-devtools-axi click <selector>"]);
  return withPage(async (page) => {
    await clickOrThrow(page, selector);
    return renderOutput(["clicked: yes", `selector: ${selector}`]);
  });
}

export async function typeCommand(args) {
  const selector = getPositional(args, 0);
  const text = getFlag(args, "--text");
  if (!selector || text === undefined)
    throw new AxiError('Usage: chrome-devtools-axi type <selector> --text "..."', "VALIDATION_ERROR");
  return withPage(async (page) => {
    try {
      await page.type(selector, text);
    } catch {
      throw new AxiError(`No element matched selector: ${selector}`, "NOT_FOUND");
    }
    return renderOutput(["typed: yes", `selector: ${selector}`, `chars: ${text.length}`]);
  });
}

export async function evalCommand(args) {
  const expr = getPositional(args, 0);
  if (!expr) throw new AxiError("Missing expression", "VALIDATION_ERROR", ["Usage: chrome-devtools-axi eval <js-expression>"]);
  return withPage(async (page) => {
    let result;
    try {
      result = await page.evaluate((e) => window.eval(e), expr);
    } catch (err) {
      throw new AxiError(`Evaluation failed: ${err?.message ?? err}`, "API_ERROR");
    }
    return renderOutput([`result: ${JSON.stringify(result) ?? "undefined"}`]);
  });
}
