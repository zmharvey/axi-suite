import { client } from "../client.js";
import { getFlag, getPositional } from "../args.js";
import { AxiError } from "../errors.js";
import { field, renderList, renderHelp, renderOutput, countLine } from "../toon.js";

export const IMAGE_HELP = `usage: figma-axi image <file_key> --ids <id1,id2,...> [--format png|svg|pdf|jpg] [--scale n]
Returns rendered-image URLs for the given nodes — Figma's API returns URLs,
not image bytes, so fetch the URL yourself to get the file. This is correct
API behavior, not a limitation of this tool.
flags:
  --format <png|svg|pdf|jpg>  default png
  --scale <n>                 default 1 (0.01-4)
examples:
  figma-axi image abc123XYZ --ids 1:23
  figma-axi image abc123XYZ --ids 1:23,1:45 --format svg --scale 2`;

const VALID_FORMATS = ["png", "svg", "pdf", "jpg"];

const imageSchema = [field("id"), field("url")];

export async function imageCommand(args) {
  const fileKey = getPositional(args, 0);
  const idsFlag = getFlag(args, "--ids");
  if (!fileKey || !idsFlag)
    throw new AxiError(
      "Usage: figma-axi image <file_key> --ids <id1,id2,...>",
      "VALIDATION_ERROR",
    );
  const format = getFlag(args, "--format") || "png";
  if (!VALID_FORMATS.includes(format))
    throw new AxiError(`Invalid --format "${format}"`, "VALIDATION_ERROR", [
      `Valid formats: ${VALID_FORMATS.join(", ")}`,
    ]);
  const scale = Number(getFlag(args, "--scale")) || 1;
  const res = await client.get(`/images/${fileKey}`, { ids: idsFlag, format, scale });
  if (res.err) throw new AxiError(`Image export failed: ${res.err}`, "API_ERROR");
  const rows = Object.entries(res.images || {}).map(([id, url]) => ({
    id,
    url: url ?? "(rendering failed)",
  }));
  return renderOutput([
    countLine(rows.length),
    renderList("images", rows, imageSchema),
    renderHelp(["These are temporary Figma-hosted URLs — fetch them promptly, don't cache long-term"]),
  ]);
}
