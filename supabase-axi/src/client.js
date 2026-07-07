import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { tokenMissingError, mapSupabaseError } from "./errors.js";

const BASE = "https://api.supabase.com/v1";

let configCache;
function loadConfig() {
  if (configCache !== undefined) return configCache;
  try {
    const p = join(homedir(), ".config", "supabase-axi", "config.json");
    configCache = JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    configCache = {};
  }
  return configCache;
}

function loadTokenFile() {
  try {
    const t = readFileSync(join(homedir(), ".config", "supabase-axi", "token"), "utf-8").trim();
    return t || undefined;
  } catch {
    return undefined;
  }
}

export function getToken() {
  const t =
    process.env.SUPABASE_ACCESS_TOKEN ||
    process.env.SUPABASE_TOKEN ||
    loadConfig().token ||
    loadTokenFile();
  if (!t) throw tokenMissingError();
  return t;
}

export function configProjectRef() {
  return process.env.SUPABASE_PROJECT_REF || loadConfig().projectRef;
}

function buildUrl(path, query) {
  const url = new URL(BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) for (const item of v) url.searchParams.append(k, String(item));
      else url.searchParams.set(k, String(v));
    }
  }
  return url;
}

async function request(method, path, { query, body } = {}) {
  const res = await fetch(buildUrl(path, query), {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
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
  if (!res.ok) throw mapSupabaseError(res.status, json);
  return json;
}

export const client = {
  get: (path, query) => request("GET", path, { query }),
  post: (path, body, query) => request("POST", path, { body, query }),
  patch: (path, body, query) => request("PATCH", path, { body, query }),
};

/** Run SQL against a project via the Management API query endpoint. */
export function runQuery(ref, sql) {
  return client.post(`/projects/${ref}/database/query`, { query: sql });
}
