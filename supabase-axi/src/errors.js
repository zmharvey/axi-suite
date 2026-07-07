import { AxiError } from "axi-sdk-js";

export { AxiError };

export function tokenMissingError() {
  return new AxiError("No Supabase access token found", "AUTH", [
    "Set env SUPABASE_ACCESS_TOKEN to a personal access token (supabase.com/dashboard/account/tokens; starts with sbp_)",
    "Or add a token field to ~/.config/supabase-axi/config.json",
  ]);
}

export function mapSupabaseError(status, body) {
  const msg = (body && (body.message || body.error || body.msg)) || `HTTP ${status}`;
  if (status === 401 || status === 403) {
    return new AxiError(`Unauthorized: ${msg}`, "AUTH", [
      "Check SUPABASE_ACCESS_TOKEN is a valid personal access token (starts with sbp_)",
    ]);
  }
  if (status === 404) return new AxiError(`Not found: ${msg}`, "NOT_FOUND");
  if (status === 429) {
    return new AxiError(`Rate limited: ${msg}`, "RATE_LIMIT", ["Wait a moment and retry"]);
  }
  return new AxiError(`Supabase API error (${status}): ${msg}`, "API_ERROR");
}
