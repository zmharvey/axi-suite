import { AxiError } from "axi-sdk-js";

export { AxiError };

export function tokenMissingError() {
  return new AxiError("No Slack token found", "AUTH", [
    "Set env SLACK_TOKEN to a user token (xoxp-…) with the needed scopes",
    "Or add a token field to ~/.config/slack-axi/config.json",
  ]);
}

// Slack returns HTTP 200 with { ok: false, error: "..." }; map the common ones.
export function mapSlackError(error, body) {
  switch (error) {
    case "not_authed":
    case "invalid_auth":
    case "token_revoked":
    case "account_inactive":
      return new AxiError(`Auth failed: ${error}`, "AUTH", [
        "Check SLACK_TOKEN is a valid, current user token (xoxp-…)",
      ]);
    case "missing_scope":
      return new AxiError(
        `Missing scope: needs '${body?.needed || "?"}', token has '${body?.provided || "?"}'`,
        "AUTH",
        ["Re-install the Slack app with the required user-token scopes"],
      );
    case "channel_not_found":
      return new AxiError("Channel not found", "NOT_FOUND", [
        "Use `slack-axi channels` to list channels and their ids",
      ]);
    case "ratelimited":
      return new AxiError("Rate limited by Slack", "RATE_LIMIT", ["Wait a moment and retry"]);
    default:
      return new AxiError(`Slack API error: ${error || "unknown"}`, "API_ERROR");
  }
}
