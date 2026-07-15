import { encode } from "@toon-format/toon";

export function field(key, as) {
  return { type: "field", key, as };
}
export function custom(as, fn) {
  return { type: "custom", as, fn };
}

export function extract(item, schema) {
  const result = {};
  for (const def of schema) {
    const outputKey = def.as ?? ("key" in def ? def.key : def.as);
    if (def.type === "field") result[outputKey] = item[def.key] ?? null;
    else if (def.type === "custom") result[outputKey] = def.fn(item);
    else throw new Error(`Unknown field type: ${def.type}`);
  }
  return result;
}

export function renderList(label, items, schema) {
  return encode({ [label]: items.map((item) => extract(item, schema)) });
}
export function renderDetail(label, item, schema) {
  return encode({ [label]: extract(item, schema) });
}
export function renderRows(label, rows) {
  return encode({ [label]: rows });
}
export function renderObject(obj) {
  return encode(obj);
}
export function renderHelp(lines) {
  const clean = (lines || []).filter(Boolean);
  if (clean.length === 0) return "";
  return `help[${clean.length}]:\n${clean.map((l) => `  ${l}`).join("\n")}`;
}
export function renderOutput(blocks) {
  return blocks.filter(Boolean).join("\n");
}
export function countLine(count, note) {
  return note ? `count: ${count} (${note})` : `count: ${count}`;
}

export function oneLine(s, max = 120) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}

function relFromMs(then) {
  const sec = Math.floor((Date.now() - then) / 1000);
  if (isNaN(sec)) return "unknown";
  if (sec < 60) return "just now";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

/** Relative time from an ISO-8601 string (Drive modifiedTime). */
export function relIso(iso) {
  if (!iso) return "unknown";
  const t = new Date(iso).getTime();
  return isNaN(t) ? "unknown" : relFromMs(t);
}

/** Relative time from epoch milliseconds (Gmail internalDate). */
export function relMs(ms) {
  if (ms === undefined || ms === null || ms === "") return "unknown";
  const t = Number(ms);
  return isNaN(t) ? "unknown" : relFromMs(t);
}
