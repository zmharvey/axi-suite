import { gfetch } from "../google-auth.js";

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export function header(msg, name) {
  const h = (msg.payload?.headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value || "";
}

export function b64urlDecode(data) {
  if (!data) return "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

/** Prefer text/plain; fall back to stripped text/html. */
export function extractBody(payload) {
  if (!payload) return "";
  const walk = (part, mime) => {
    if (part.mimeType === mime && part.body?.data) return b64urlDecode(part.body.data);
    if (part.parts) for (const p of part.parts) {
      const t = walk(p, mime);
      if (t) return t;
    }
    return "";
  };
  let text = walk(payload, "text/plain");
  if (!text) text = walk(payload, "text/html").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text;
}

export function getMeta(id) {
  return gfetch(
    `${API}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
  );
}

export { API };
