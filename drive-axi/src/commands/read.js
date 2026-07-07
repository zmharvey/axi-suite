import { gfetch, gfetchText } from "../google-auth.js";
import { getPositional, hasFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { renderOutput } from "../toon.js";

const LIMIT = 4000;

export async function readCommand(args) {
  const id = getPositional(args, 0);
  if (!id) throw new AxiError("Usage: drive-axi read <file_id> [--full]", "VALIDATION_ERROR");
  const meta = await gfetch(
    `https://www.googleapis.com/drive/v3/files/${id}?fields=name,mimeType&supportsAllDrives=true`,
  );
  const mime = meta.mimeType || "";
  let txt;
  if (mime.startsWith("application/vnd.google-apps")) {
    const exportType = mime.includes("spreadsheet") ? "text/csv" : "text/plain";
    txt = await gfetchText(
      `https://www.googleapis.com/drive/v3/files/${id}/export?mimeType=${encodeURIComponent(exportType)}`,
    );
  } else {
    txt = await gfetchText(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
  }
  const full = hasFlag(args, "--full");
  const shown =
    !full && txt.length > LIMIT
      ? `${txt.slice(0, LIMIT)}\n... [+${txt.length - LIMIT} chars, use --full]`
      : txt;
  return renderOutput([
    `file: ${meta.name}`,
    `type: ${mime}`,
    "content: |",
    shown.split("\n").map((l) => "  " + l).join("\n"),
  ]);
}
