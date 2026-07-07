// Google OAuth consent as a command — (re)mints the shared refresh token used by
// BOTH drive-axi and gmail-axi. Run it interactively: it prints a URL, you approve
// in the browser, and it saves ~/.config/google-axi/token.json.
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import http from "node:http";
import { AxiError } from "./errors.js";
import { renderOutput, renderHelp } from "./toon.js";

const DIR = join(homedir(), ".config", "google-axi");
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
].join(" ");

export const AUTH_HELP = `usage: auth <login|logout>
  login   run the Google OAuth consent flow (Drive + Gmail scopes); stores the
          shared refresh token used by both drive-axi and gmail-axi
  logout  remove the stored token`;

export async function authCommand(args) {
  const sub = args[0];
  if (sub === "logout") {
    const p = join(DIR, "token.json");
    if (existsSync(p)) unlinkSync(p);
    return renderOutput([`logged out: removed ${p.replace(homedir(), "~")}`]);
  }
  if (sub && sub !== "login") {
    throw new AxiError(`Unknown auth subcommand: ${sub}`, "VALIDATION_ERROR", ["Use: auth login | auth logout"]);
  }
  let creds;
  try {
    creds = JSON.parse(readFileSync(join(DIR, "oauth.json"), "utf8"));
  } catch {
    throw new AxiError("Missing OAuth client at ~/.config/google-axi/oauth.json", "AUTH", [
      'Add {"clientId":"…","clientSecret":"…"} from a Google Cloud OAuth "Desktop app" client',
    ]);
  }
  return await new Promise((resolve) => {
    let redirectUri;
    const server = http.createServer(async (req, res) => {
      const u = new URL(req.url, "http://127.0.0.1");
      const code = u.searchParams.get("code");
      const err = u.searchParams.get("error");
      if (!code && !err) {
        res.writeHead(204);
        res.end();
        return;
      }
      if (err) {
        res.end(`Authorization error: ${err}`);
        server.close();
        resolve(renderOutput([`auth failed: ${err}`]));
        return;
      }
      const body = new URLSearchParams({
        code,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      });
      const tok = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }).then((r) => r.json());
      if (!tok.refresh_token) {
        res.end("No refresh token returned — check the terminal.");
        server.close();
        resolve(renderOutput([`auth failed: no refresh_token (${tok.error || "unknown"})`]));
        return;
      }
      writeFileSync(
        join(DIR, "token.json"),
        JSON.stringify({ refresh_token: tok.refresh_token, access_token: tok.access_token, expiry: Date.now() + (tok.expires_in || 3600) * 1000, scope: tok.scope }, null, 2),
        { mode: 0o600 },
      );
      res.end("Authorized — token saved. You can close this tab and return to the terminal.");
      server.close();
      resolve(renderOutput(["authorized: saved ~/.config/google-axi/token.json", renderHelp(["Both drive-axi and gmail-axi now work"])]));
    });
    server.listen(0, "127.0.0.1", () => {
      redirectUri = `http://127.0.0.1:${server.address().port}`;
      const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      auth.searchParams.set("client_id", creds.clientId);
      auth.searchParams.set("redirect_uri", redirectUri);
      auth.searchParams.set("response_type", "code");
      auth.searchParams.set("scope", SCOPES);
      auth.searchParams.set("access_type", "offline");
      auth.searchParams.set("prompt", "consent");
      process.stdout.write(`\nOpen this URL and approve (Drive + Gmail):\n\n${auth.toString()}\n\nWaiting for authorization… (Ctrl-C to cancel)\n`);
    });
    setTimeout(() => {
      try {
        server.close();
      } catch {
        /* ignore */
      }
      resolve(renderOutput(["auth timed out (5 min) — re-run `auth login`"]));
    }, 300000);
  });
}
