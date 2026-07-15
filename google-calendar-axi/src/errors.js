import { AxiError } from "axi-sdk-js";

export { AxiError };

/**
 * Map a non-2xx Google Calendar API response into a structured AxiError.
 * Mirrors clickup-axi's `mapClickUpError`. Not currently wired into
 * `google-auth.js`'s `gfetch`/`gfetchText` (those are copied byte-for-byte
 * and already throw a generic AUTH/API_ERROR AxiError) — this is available
 * for any call site that does its own status-aware handling.
 * @param {number} status - HTTP status code from the failed response.
 * @param {object} [body] - Parsed JSON error body, if any (`{ error: { message, status } }`).
 * @returns {AxiError} A structured error with an actionable code and suggestions.
 */
export function mapGoogleCalendarError(status, body) {
  const msg = (body && body.error && (body.error.message || body.error.status)) || `HTTP ${status}`;
  if (status === 401 || status === 403) {
    return new AxiError(`Unauthorized: ${msg}`, "AUTH", [
      "Run `google-calendar-axi auth login` to (re)authorize",
      "Check ~/.config/google-axi/token.json has the calendar.events scope",
    ]);
  }
  if (status === 404) return new AxiError(`Not found: ${msg}`, "NOT_FOUND");
  if (status === 429) {
    return new AxiError(`Rate limited: ${msg}`, "RATE_LIMIT", [
      "Google Calendar API caps requests per user per 100 seconds — wait a moment and retry",
    ]);
  }
  return new AxiError(`Google Calendar API error: ${msg}`, "API_ERROR");
}
