// Guided connection-string capture: hidden interactive paste (TTY) or piped
// stdin (scripts). Same shape as clickup-axi's auth.js — this just stores
// whatever secret string it's given (a Mongo connection URI, not an OAuth
// token), so only the user-facing wording differs.
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import readline from "node:readline";
import { AxiError } from "./errors.js";
import { renderOutput, renderHelp } from "./toon.js";

export const AUTH_HELP = `usage: auth <login|logout>
  login    paste your connection string — input is hidden; also reads piped stdin for scripts
  logout   remove the stored connection string`;

async function readPiped() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8").trim();
}

function promptHidden(prompt) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl.stdoutMuted = true;
    rl._writeToOutput = (s) => {
      if (!rl.stdoutMuted) rl.output.write(s);
    };
    process.stdout.write(prompt);
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer.trim());
    });
  });
}

const tilde = (p) => (process.env.HOME ? p.replace(process.env.HOME, "~") : p);

export async function authCommand(args, meta) {
  const sub = args[0];
  if (sub === "logout") {
    if (existsSync(meta.tokenPath)) unlinkSync(meta.tokenPath);
    return renderOutput([`logged out: removed ${tilde(meta.tokenPath)}`]);
  }
  if (sub && sub !== "login") {
    throw new AxiError(`Unknown auth subcommand: ${sub}`, "VALIDATION_ERROR", ["Use: auth login | auth logout"]);
  }
  const token = process.stdin.isTTY
    ? await promptHidden(`Paste your ${meta.tool} connection string (input hidden), then press Enter:\n`)
    : await readPiped();
  if (!token) throw new AxiError("No connection string provided", "VALIDATION_ERROR", meta.hint ? [meta.hint] : []);
  mkdirSync(dirname(meta.tokenPath), { recursive: true });
  writeFileSync(meta.tokenPath, token, { mode: 0o600 });
  return renderOutput([
    `saved: ${tilde(meta.tokenPath)} (${token.length} chars, prefix ${token.slice(0, 4)}…)`,
    renderHelp([`Run \`${meta.tool}\` to verify it works`]),
  ]);
}
