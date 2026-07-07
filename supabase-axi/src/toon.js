import { encode } from "@toon-format/toon";

// --- Field schema constructors ---------------------------------------------

export function field(key, as) {
  return { type: "field", key, as };
}
export function pluck(key, subkey, as) {
  return { type: "pluck", key, subkey, as };
}
export function custom(as, fn) {
  return { type: "custom", as, fn };
}
export function lower(key, as) {
  return { type: "lower", key, as };
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
      case "lower":
        result[outputKey] =
          typeof item[def.key] === "string" ? item[def.key].toLowerCase() : item[def.key];
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

/** Render a labeled list of items as a TOON table using a field schema. */
export function renderList(label, items, schema) {
  return encode({ [label]: items.map((item) => extract(item, schema)) });
}

/** Render a single labeled detail object as TOON. */
export function renderDetail(label, item, schema) {
  return encode({ [label]: extract(item, schema) });
}

/** Render arbitrary uniform rows (e.g. SQL results) as a TOON table. */
export function renderRows(label, rows) {
  return encode({ [label]: rows });
}

/** Render a plain object as TOON. */
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
