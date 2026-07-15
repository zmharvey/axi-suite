// No token to store — github-axi delegates entirely to `gh`'s own auth
// (token storage, refresh, SSO all handled by the gh CLI already installed
// and authenticated on this machine). This command just proxies to it, kept
// as `auth` for the same dispatch shape every other AXI tool uses.
import { spawnSync } from "node:child_process";
import { AxiError } from "./errors.js";
import { ghText } from "./gh.js";
import { renderOutput } from "./toon.js";

export const AUTH_HELP = `usage: auth <login|logout|status>
github-axi has no separate credential — it shells out to \`gh\`, which owns
its own authentication. This command just checks or drives \`gh\`'s.
  status (default)  show \`gh auth status\`
  login             run \`gh auth login\` interactively (prompts in this terminal)
  logout            run \`gh auth logout\` interactively`;

// login/logout are genuinely interactive (browser flow, y/n prompts) — hand
// the TTY straight to gh rather than capturing/reformatting its output.
function runInteractive(args) {
  const res = spawnSync("gh", args, { stdio: "inherit" });
  if (res.status !== 0) throw new AxiError(`gh ${args.join(" ")} exited ${res.status}`, "AUTH");
}

export async function authCommand(args) {
  const sub = args[0];
  if (sub === "login") {
    runInteractive(["auth", "login"]);
    return renderOutput(["done — re-run `github-axi auth status` to confirm"]);
  }
  if (sub === "logout") {
    runInteractive(["auth", "logout"]);
    return renderOutput(["done"]);
  }
  if (sub && sub !== "status") {
    throw new AxiError(`Unknown auth subcommand: ${sub}`, "VALIDATION_ERROR", ["Use: auth status | login | logout"]);
  }
  const out = await ghText(["auth", "status"]);
  return renderOutput([out.trim()]);
}
