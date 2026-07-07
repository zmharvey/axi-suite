import { AxiError } from "axi-sdk-js";

export { AxiError };

/** Raised when no API token is configured. */
export function tokenMissingError() {
  return new AxiError("No ClickUp API token found", "AUTH", [
    "Set env CLICKUP_API_TOKEN to a personal token (ClickUp -> Settings -> Apps -> API Token; starts with pk_)",
    "Or add a token field to ~/.config/clickup-axi/config.json",
  ]);
}

/** Map a non-2xx ClickUp API response into a structured AxiError. */
export function mapClickUpError(status, body) {
  const msg = (body && (body.err || body.error)) || `HTTP ${status}`;
  const ecode = body && body.ECODE ? ` [${body.ECODE}]` : "";
  if (status === 401 || status === 403) {
    return new AxiError(`Unauthorized: ${msg}`, "AUTH", [
      "Check CLICKUP_API_TOKEN is a valid personal token (starts with pk_)",
    ]);
  }
  if (status === 404) return new AxiError(`Not found: ${msg}`, "NOT_FOUND");
  if (status === 429) {
    return new AxiError(`Rate limited: ${msg}`, "RATE_LIMIT", [
      "ClickUp caps at 100 req/min on the free plan — wait a moment and retry",
    ]);
  }
  return new AxiError(`ClickUp API error${ecode}: ${msg}`, "API_ERROR");
}
