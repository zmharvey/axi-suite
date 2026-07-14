import { AxiError } from "axi-sdk-js";

export { AxiError };

/** Raised when no browser session has been started yet, or it was closed. */
export function sessionMissingError() {
  return new AxiError("No active browser session", "NOT_FOUND", [
    "Run `chrome-devtools-axi session start` first",
  ]);
}

/** Raised when the debug port can't be reached at all. */
export function connectError(browserURL, cause) {
  return new AxiError(`Can't reach Chrome at ${browserURL}: ${cause}`, "AUTH", [
    "Start Chrome with --remote-debugging-port (or your existing headless setup)",
    "Run `chrome-devtools-axi auth login --browser-url <url>` to point at a different debug port",
  ]);
}
