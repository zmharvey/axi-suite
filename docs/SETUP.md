# Setup for the two tools that need more than a paste-in token

`clickup-axi` and `supabase-axi` just need a personal token you paste into `auth login`. The two below need a one-time app/OAuth setup because their APIs require it. You do this once; then `auth login` is all you touch.

---

## Slack (`slack-axi`)

Slack has no "copy my API token" button — you create a tiny personal Slack app and grab its user token. ~3 minutes.

1. Go to <https://api.slack.com/apps> → **Create New App** → **From scratch**. Name it anything (e.g. "slack-axi"); pick your workspace.
2. In the app, open **OAuth & Permissions**.
3. Under **User Token Scopes** (not Bot scopes), add:
   - `search:read`
   - `channels:history`, `groups:history`, `im:history`, `mpim:history`
   - `channels:read`, `groups:read`
   - `users:read`
   - `chat:write` *(only if you want the draft-first `send` command; omit for read-only)*
4. Scroll up → **Install to Workspace** → approve.
5. Copy the **User OAuth Token** (starts `xoxp-`).
6. Run `slack-axi auth login` and paste it.

The token acts as **you** — searches see what you can see, and `send` (if enabled) posts as you. `send` is draft-first and needs `--confirm`.

---

## Google Drive + Gmail + Calendar (`drive-axi`, `gmail-axi`, `google-calendar-axi`)

All three share one Google Cloud OAuth "Desktop app" client and one refresh token. ~5 minutes, once.

### 1. Create an OAuth client

1. Go to <https://console.cloud.google.com/> and create (or pick) a project.
2. **APIs & Services → Enabled APIs** → enable **Google Drive API**, **Gmail API**, and **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**: configure it. For a personal/internal tool, "Internal" (if you're on Google Workspace) is simplest — only people in your Workspace can use this client. Otherwise choose "External" and add yourself as a test user.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID → Application type: Desktop app**. Create.
5. Download the client — you get a **client ID** and **client secret**.

### 2. Store the client

Save the two values to `~/.config/google-axi/oauth.json`:

```json
{ "client_id": "XXXX.apps.googleusercontent.com", "client_secret": "GOCSPX-XXXX" }
```

### 3. Consent once

Run `drive-axi auth login` (or `gmail-axi auth login` / `google-calendar-axi auth login` — any of the three). It opens a browser consent flow on a local loopback port, you approve, and it writes a refresh token to `~/.config/google-axi/token.json`. All three tools share this — you only do it once.

Scopes requested: `drive.readonly`, `gmail.readonly`, `gmail.compose` (compose = create drafts only; there is no send scope, so Gmail can never send), `calendar.events` (read + create/delete events; no calendar-admin/ACL scope).

If you already ran `auth login` before Calendar support was added, re-run it once to pick up the new scope — Google's consent screen only grants what was requested in that specific approval, so an old token won't have `calendar.events` until you re-consent.

### Handing this to teammates

- **Same Google Workspace:** share the `oauth.json` client ID/secret; each teammate runs their own `auth login` (their own refresh token, their own data). An "Internal" consent screen covers everyone in the Workspace.
- **Outside your Workspace:** they create their own Google Cloud project + OAuth client (steps 1–2), then `auth login`.
