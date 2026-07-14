import { encode } from "@toon-format/toon";

// --- Field schema constructors ---------------------------------------------

export function field(key, as) {
  return { type: "field", key, as };
}
export function pluck(key, subkey, as) {
  return { type: "pluck", key, subkey, as };
}
export function joinArray(key, subkey, as, empty = "none") {
  return { type: "joinArray", key, subkey, as, empty };
}
export function relMsField(key, as) {
  return { type: "relMs", key, as };
}
export function boolYesNo(key, as) {
  return { type: "boolYesNo", key, as };
}
export function lower(key, as) {
  return { type: "lower", key, as };
}
export function custom(as, fn) {
  return { type: "custom", as, fn };
}

// --- Extraction -------------------------------------------------------------

export function extract(item, schema) {
  const result = {};
  for (const def of schema) {
    const outputKey = def.as ?? ("key" in def ? def.key : def.as);
    switch (def.type) {
      case "field":
        result[outputKey] = item[def.key] ?? null;
        break;
      case "pluck":
        result[outputKey] = item[def.key]?.[def.subkey] ?? null;
        break;
      case "joinArray": {
        const arr = item[def.key];
        if (Array.isArray(arr) && arr.length > 0) {
          result[outputKey] = arr
            .map((x) => (typeof x === "string" ? x : x[def.subkey]))
            .filter(Boolean)
            .join(",");
        } else {
          result[outputKey] = def.empty ?? "none";
        }
        break;
      }
      case "relMs":
        result[outputKey] = relMs(item[def.key]);
        break;
      case "boolYesNo":
        result[outputKey] = item[def.key] ? "yes" : "no";
        break;
      case "lower":
        result[outputKey] =
          typeof item[def.key] === "string"
            ? item[def.key].toLowerCase()
            : item[def.key];
        break;
      case "custom":
        result[outputKey] = def.fn(item);
        break;
      default:
        throw new Error(`Unknown field type: ${def.type}`);
    }
  }
  return result;
}

// --- Renderers --------------------------------------------------------------

/** Render a labeled list of items as a TOON table. */
export function renderList(label, items, schema) {
  const extracted = items.map((item) => extract(item, schema));
  return encode({ [label]: extracted });
}

/** Render a single labeled detail object as TOON. */
export function renderDetail(label, item, schema) {
  return encode({ [label]: extract(item, schema) });
}

/** Render a plain object as TOON (for ad-hoc detail views). */
export function renderObject(obj) {
  return encode(obj);
}

/** Render next-step hints. encode() inlines primitive arrays, so format manually. */
export function renderHelp(lines) {
  const clean = (lines || []).filter(Boolean);
  if (clean.length === 0) return "";
  const indented = clean.map((l) => `  ${l}`).join("\n");
  return `help[${clean.length}]:\n${indented}`;
}

/** Combine TOON blocks into one output string. */
export function renderOutput(blocks) {
  return blocks.filter(Boolean).join("\n");
}

/** Standard count line. */
export function countLine(count, note) {
  return note ? `count: ${count} (${note})` : `count: ${count}`;
}

// --- Time -------------------------------------------------------------------

/** ClickUp timestamps are epoch-ms strings. Convert to a relative label. */
export function relMs(ms) {
  if (ms === undefined || ms === null || ms === "") return "unknown";
  const then = Number(ms);
  if (isNaN(then)) return "unknown";
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 0) {
    // future (e.g. due date)
    return relFuture(-diffSec);
  }
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon}mo ago`;
  return `${Math.floor(mon / 12)}y ago`;
}

function relFuture(sec) {
  const day = Math.floor(sec / 86400);
  if (day < 1) {
    const hr = Math.floor(sec / 3600);
    return hr < 1 ? "soon" : `in ${hr}h`;
  }
  if (day < 30) return `in ${day}d`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `in ${mon}mo`;
  return `in ${Math.floor(mon / 12)}y`;
}
