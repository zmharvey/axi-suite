// Shells out to the `gh` CLI rather than talking to GitHub's API directly —
// gh already handles auth (token storage, refresh, SSO), so this tool has no
// auth.js of its own to write or token to store. That's the whole point of
// wrapping gh instead of reimplementing a GitHub client from scratch.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mapGhError } from "./errors.js";

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 10 * 1024 * 1024;

/** Run `gh <args>` and parse its JSON stdout (requires a `--json <fields>` arg). */
export async function ghJson(args) {
  try {
    const { stdout } = await execFileAsync("gh", args, { maxBuffer: MAX_BUFFER });
    return JSON.parse(stdout);
  } catch (err) {
    throw mapGhError(err);
  }
}

/**
 * Run `gh <args>` and return raw stdout (for subcommands with no --json
 * support, e.g. `pr checks`). Some of those exit non-zero on a real result
 * (failing/pending checks) rather than a tool error, so stdout/stderr are
 * still surfaced on a non-zero exit instead of always throwing.
 */
export async function ghText(args) {
  try {
    const { stdout } = await execFileAsync("gh", args, { maxBuffer: MAX_BUFFER });
    return stdout;
  } catch (err) {
    if (err.stdout || err.stderr) return `${err.stdout || ""}${err.stderr || ""}`;
    throw mapGhError(err);
  }
}

/** Run a `gh` subcommand for its side effect (create/comment); returns stdout. */
export async function ghRun(args) {
  try {
    const { stdout } = await execFileAsync("gh", args, { maxBuffer: MAX_BUFFER });
    return stdout.trim();
  } catch (err) {
    throw mapGhError(err);
  }
}
