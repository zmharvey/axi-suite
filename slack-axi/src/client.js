import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { tokenMissingError, mapSlackError } from "./errors.js";

const BASE = "https://slack.com/api";

let configCache;
function loadConfig() {
  if (configCache !== undefined) return configCache;
  try {
    configCache = JSON.parse(readFileSync(join(homedir(), ".config", "slack-axi", "config.json"), "utf-8"));
  } catch {
    configCache = {};
  }
  return configCache;
}

function loadTokenFile() {
  try {
    const t = readFileSync(join(homedir(), ".config", "slack-axi", "token"), "utf-8").trim();
    return t || undefined;
  } catch {
    return undefined;
  }
}

export function getToken() {
  const t =
    process.env.SLACK_TOKEN ||
    process.env.SLACK_USER_TOKEN ||
    loadConfig().token ||
    loadTokenFile();
  if (!t) throw tokenMissingError();
  return t;
}

async function call(method, params, { post } = {}) {
  const auth = { Authorization: `Bearer ${getToken()}` };
  let res;
  if (post) {
    res = await fetch(`${BASE}/${method}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(params || {}),
    });
  } else {
    const url = new URL(`${BASE}/${method}`);
    for (const [k, v] of Object.entries(params || {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
    res = await fetch(url, { headers: auth });
  }
  const json = await res.json().catch(() => ({ ok: false, error: `http_${res.status}` }));
  if (!json.ok) throw mapSlackError(json.error, json);
  return json;
}

export const slack = {
  get: (method, params) => call(method, params),
  post: (method, params) => call(method, params, { post: true }),
};
