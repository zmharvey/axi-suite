import { gfetch } from "../google-auth.js";
import { field, custom, relIso, oneLine } from "../toon.js";

export function mimeShort(m) {
  if (!m) return "?";
  const map = {
    "application/vnd.google-apps.document": "doc",
    "application/vnd.google-apps.spreadsheet": "sheet",
    "application/vnd.google-apps.presentation": "slides",
    "application/vnd.google-apps.folder": "folder",
    "application/vnd.google-apps.form": "form",
    "application/pdf": "pdf",
  };
  return map[m] || m.split(/[./]/).pop();
}

export const fileSchema = [
  field("id"),
  custom("name", (f) => oneLine(f.name, 64)),
  custom("type", (f) => mimeShort(f.mimeType)),
  custom("modified", (f) => relIso(f.modifiedTime)),
  custom("owner", (f) => f.owners?.[0]?.displayName || ""),
];

const FIELDS = "files(id,name,mimeType,modifiedTime,owners(displayName),size)";

export async function listFiles(q, { pageSize = 15, orderBy = "modifiedTime desc" } = {}) {
  const u = new URL("https://www.googleapis.com/drive/v3/files");
  if (q) u.searchParams.set("q", q);
  u.searchParams.set("pageSize", String(pageSize));
  u.searchParams.set("orderBy", orderBy);
  u.searchParams.set("fields", FIELDS);
  u.searchParams.set("spaces", "drive");
  u.searchParams.set("corpora", "user");
  return (await gfetch(u.toString())).files || [];
}

export function esc(s) {
  return (s || "").replace(/'/g, "\\'");
}
