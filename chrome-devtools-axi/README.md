# chrome-devtools-axi

An [AXI](https://github.com/kunchenguid/axi)-style CLI for driving an already-running Chrome/Chromium instance over its remote-debugging port — built for agents (Claude Code) to use instead of the chrome-devtools MCP: fewer tokens, no persistent tool schema.

Unlike the other tools in this suite, this one is **not** a stateless REST wrapper — driving a browser is inherently stateful (navigate, then click, then screenshot, against the *same* tab). Each CLI invocation is a fresh process, so a lightweight tracked-tab model bridges that: `session start` opens a tab and remembers its real CDP `targetId`; every other command reconnects, finds that same tab by targetId (via the documented `Target.getTargetInfo` protocol command — not a private puppeteer internal), acts on it, then disconnects (never closes the browser — it isn't this tool's to close).

## Setup

Point it at a Chrome debug port (defaults to `http://localhost:9222`, matching a typical `--remote-debugging-port=9222` headless setup):

```sh
chrome-devtools-axi auth login --browser-url http://localhost:9222
```

There's no credential to store — `auth login` just checks the port answers and remembers the URL. Override per-command with `--browser-url`, or set `$CHROME_DEVTOOLS_AXI_URL`.

## Commands

```
chrome-devtools-axi                              dashboard: current session, if any
chrome-devtools-axi session start [--url <url>]  open + track a new tab
chrome-devtools-axi session status               show the tracked tab's url/title
chrome-devtools-axi session stop                 close the tracked tab
chrome-devtools-axi navigate <url>
chrome-devtools-axi screenshot [--out <path>] [--full-page]
chrome-devtools-axi content [--selector <css>]   page or element text
chrome-devtools-axi click <selector>
chrome-devtools-axi type <selector> --text "..."
chrome-devtools-axi eval <js-expression>         runs in page context
```

## New dependency

`puppeteer-core` — connects to an existing browser via `connect({ browserURL })`; it does not bundle or launch a browser itself, matching this tool's "drive what's already running" model.

## Scope

This covers the day-to-day of driving one tab: navigate, screenshot, click, type, eval, read text. It does not cover: multiple simultaneous tracked tabs, network request interception/mocking, console log capture, device emulation, or PDF export. Keep the chrome-devtools MCP around for those until/unless this grows to cover them.

`click`/`type`/`eval` are not draft-first — they act immediately, matching the chrome-devtools MCP's own behavior for the same actions. They only affect the browser tab you started a session against.

## Architecture

| File | Role |
|------|------|
| `src/client.js` | Debug-port connection + tab-tracking-by-targetId (the per-connector part) |
| `src/toon.js` | field schemas + TOON renderers (reusable) |
| `src/args.js` | flag/positional parsing (reusable) |
| `src/auth.js` | debug-port connectivity check (no credential — Chrome has none) |
| `src/errors.js` | connection/session errors → structured `AxiError` |
| `src/commands/*` | one file per noun (session, page, interact) |
| `src/cli.js` | dispatch via `runAxiCli` from `axi-sdk-js` |
