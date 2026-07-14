import { client } from "../client.js";
import { getFlag, getPositional } from "../args.js";
import { AxiError } from "../errors.js";
import { field, custom, renderDetail, renderList, renderHelp, renderOutput, countLine } from "../toon.js";

export const FILE_HELP = `usage: figma-axi file <file_key> [--depth n]
Shows a compact file summary (name, lastModified, version, top-level pages
and their top-level frame names) — not the full node tree, which can be huge.
--depth controls how deep Figma expands the tree before returning it:
  1 = pages only, 2 (default here) = pages + their direct children, 3+ = deeper.
Higher --depth returns more data and a bigger response.
examples:
  figma-axi file abc123XYZ
  figma-axi file abc123XYZ --depth 1`;

const fileSchema = [field("name"), field("lastModified"), field("version")];

const pageSchema = [
  field("id"),
  field("name"),
  custom("frames", (p) =>
    (p.children || []).map((c) => c.name).filter(Boolean).join(", ") || "none",
  ),
];

export async function fileCommand(args) {
  const fileKey = getPositional(args, 0);
  if (!fileKey) throw new AxiError("Missing file_key", "VALIDATION_ERROR");
  const depth = Number(getFlag(args, "--depth")) || 2;
  const file = await client.get(`/files/${fileKey}`, { depth });
  const pages = file.document?.children || [];
  return renderOutput([
    renderDetail("file", file, fileSchema),
    countLine(pages.length) + " pages",
    renderList("pages", pages, pageSchema),
    renderHelp([
      `Run \`figma-axi node ${fileKey} --ids <id1,id2>\` for specific node detail`,
      `Run \`figma-axi image ${fileKey} --ids <id1,id2>\` for export URLs`,
      `Run \`figma-axi comments ${fileKey}\` to read comments`,
    ]),
  ]);
}
