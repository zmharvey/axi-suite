// Shared Google OAuth: reads the client creds + refresh token written by the
// one-time consent flow, and mints/refreshes access tokens on demand.
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { AxiError } from "./errors.js";

const DIR = join(homedir(), ".config", "google-axi");
let cached; // { access_token, expiry }

function authMissing(what) {
  return new AxiError(`Google auth not set up (${what} missing)`, "AUTH", [
    "Run the one-time consent flow to create ~/.config/google-axi/token.json",
  ]);
}
function loadJson(name, what) {
  try {
    return JSON.parse(readFileSync(join(DIR, name), "utf8"));
  } catch {
    throw authMissing(what);
  }
}

export async function getAccessToken() {
  const now = Date.now();
  if (cached && cached.expiry - 60000 > now) return cached.access_token;
  const tok = loadJson("token.json", "token.json");
  if (tok.access_token && tok.expiry && tok.expiry - 60000 > now) {
    cached = { access_token: tok.access_token, expiry: tok.expiry };
    return tok.access_token;
  }
  const { clientId, clientSecret } = loadJson("oauth.json", "oauth.json");
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: tok.refresh_token,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await res.json();
  if (!j.access_token)
    throw new AxiError(`Google token refresh failed: ${j.error || "unknown"}`, "AUTH", [
      "Re-run the one-time consent flow to refresh authorization",
    ]);
  const expiry = now + (j.expires_in || 3600) * 1000;
  cached = { access_token: j.access_token, expiry };
  try {
    writeFileSync(join(DIR, "token.json"), JSON.stringify({ ...tok, access_token: j.access_token, expiry }, null, 2), {
      mode: 0o600,
    });
  } catch {
    /* non-fatal */
  }
  return j.access_token;
}

/** Authed fetch returning parsed JSON; throws AxiError on non-2xx. */
export async function gfetch(url, opts = {}) {
  const at = await getAccessToken();
  const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${at}` } });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg = json.error?.message || json.error || text.slice(0, 140);
    throw new AxiError(`Google API error (${res.status}): ${msg}`, res.status === 401 ? "AUTH" : "API_ERROR");
  }
  return json;
}

/** Authed fetch returning the raw text body (for media/export downloads). */
export async function gfetchText(url, opts = {}) {
  const at = await getAccessToken();
  const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${at}` } });
  const text = await res.text();
  if (!res.ok) throw new AxiError(`Google API error (${res.status}): ${text.slice(0, 140)}`, "API_ERROR");
  return text;
}
