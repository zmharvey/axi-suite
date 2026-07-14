import { AxiError } from "axi-sdk-js";

export { AxiError };

/** Raised when no API token is configured. */
export function tokenMissingError() {
  return new AxiError("No Figma API token found", "AUTH", [
    "Set env FIGMA_API_TOKEN to a personal access token (Figma -> Settings -> Security -> Personal access tokens; typically starts with figd_)",
    "Or add a token field to ~/.config/figma-axi/config.json",
  ]);
}

/** Map a non-2xx Figma API response into a structured AxiError. */
export function mapFigmaError(status, body) {
  const msg = (body && (body.err || body.message)) || `HTTP ${status}`;
  if (status === 401 || status === 403) {
    return new AxiError(`Unauthorized: ${msg}`, "AUTH", [
      "Check FIGMA_API_TOKEN is a valid personal access token (typically starts with figd_) with the scope this command needs (file_content:read, file_comments:read/write, projects:read)",
    ]);
  }
  if (status === 404) return new AxiError(`Not found: ${msg}`, "NOT_FOUND");
  if (status === 429) {
    return new AxiError(`Rate limited: ${msg}`, "RATE_LIMIT", [
      "Figma enforces per-endpoint rate limits — wait a moment and retry",
    ]);
  }
  return new AxiError(`Figma API error: ${msg}`, "API_ERROR");
}
