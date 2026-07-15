import { AxiError } from "axi-sdk-js";

export { AxiError };

/**
 * Map a failed `gh` subprocess invocation into a structured AxiError.
 * @param {Error & {stderr?: string}} err - The error thrown by execFile/execFileAsync.
 * @returns {AxiError} A structured error with an actionable code and suggestions.
 */
export function mapGhError(err) {
  const msg = (err.stderr || err.message || "").trim();
  if (/gh auth login|not logged into any/i.test(msg)) {
    return new AxiError("gh is not authenticated", "AUTH", [
      "Run `github-axi auth login` (or `gh auth login` directly)",
    ]);
  }
  if (/could not resolve to|not found/i.test(msg)) {
    return new AxiError(`Not found: ${msg}`, "NOT_FOUND");
  }
  if (/rate limit/i.test(msg)) {
    return new AxiError(`Rate limited: ${msg}`, "RATE_LIMIT", [
      "GitHub's API rate limits are per-hour — wait a moment and retry",
    ]);
  }
  if (/command not found|ENOENT/i.test(msg)) {
    return new AxiError("`gh` is not installed", "VALIDATION_ERROR", [
      "Install the GitHub CLI: https://cli.github.com",
    ]);
  }
  return new AxiError(`gh error: ${msg || "unknown"}`, "API_ERROR");
}
