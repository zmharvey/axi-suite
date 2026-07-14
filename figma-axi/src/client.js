import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { tokenMissingError, mapFigmaError } from "./errors.js";

const BASE = "https://api.figma.com/v1";

let configCache;
function loadConfig() {
  if (configCache !== undefined) return configCache;
  try {
    const p = join(homedir(), ".config", "figma-axi", "config.json");
    configCache = JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    configCache = {};
  }
  return configCache;
}

function loadTokenFile() {
  try {
    const p = join(homedir(), ".config", "figma-axi", "token");
    const t = readFileSync(p, "utf-8").trim();
    return t || undefined;
  } catch {
    return undefined;
  }
}

/** Resolve the Figma personal access token: env > config.json > token file. */
export function getToken() {
  const t =
    process.env.FIGMA_API_TOKEN ||
    process.env.FIGMA_TOKEN ||
    loadConfig().token ||
    loadTokenFile();
  if (!t) throw tokenMissingError();
  return t;
}

function buildUrl(path, query) {
  const url = new URL(BASE + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) {
        url.searchParams.set(k, v.join(","));
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
      "X-Figma-Token": getToken(),
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
  if (!res.ok) throw mapFigmaError(res.status, json);
  return json;
}

export const client = {
  get: (path, query) => request("GET", path, { query }),
  post: (path, body, query) => request("POST", path, { body, query }),
};
