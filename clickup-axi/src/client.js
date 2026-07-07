import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { tokenMissingError, mapClickUpError } from "./errors.js";

const BASE = "https://api.clickup.com/api/v2";

let configCache;
function loadConfig() {
  if (configCache !== undefined) return configCache;
  try {
    const p = join(homedir(), ".config", "clickup-axi", "config.json");
    configCache = JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    configCache = {};
  }
  return configCache;
}

function loadTokenFile() {
  try {
    const p = join(homedir(), ".config", "clickup-axi", "token");
    const t = readFileSync(p, "utf-8").trim();
    return t || undefined;
  } catch {
    return undefined;
  }
}

export function getToken() {
  const t =
    process.env.CLICKUP_API_TOKEN ||
    process.env.CLICKUP_TOKEN ||
    loadConfig().token ||
    loadTokenFile();
  if (!t) throw tokenMissingError();
  return t;
}

export function configWorkspaceId() {
  return (
    process.env.CLICKUP_TEAM_ID ||
    process.env.CLICKUP_WORKSPACE_ID ||
    loadConfig().workspaceId
  );
}

function buildUrl(path, query) {
  const url = new URL(BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        for (const item of v) url.searchParams.append(`${k}[]`, String(item));
      } else {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url;
}

async function request(method, path, { query, body } = {}) {
  const url = buildUrl(path, query);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: getToken(),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw mapClickUpError(res.status, json);
  return json;
}

export const client = {
  get: (path, query) => request("GET", path, { query }),
  post: (path, body, query) => request("POST", path, { body, query }),
  put: (path, body, query) => request("PUT", path, { body, query }),
  del: (path, query) => request("DELETE", path, { query }),
};
