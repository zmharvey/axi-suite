import { client } from "../client.js";
import { getFlag, getPositional } from "../args.js";
import { AxiError } from "../errors.js";
import { field, custom, renderList, renderHelp, renderOutput, countLine } from "../toon.js";

export const NODE_HELP = `usage: figma-axi node <file_key> --ids <id1,id2,...>
Shows detail for specific nodes (id, name, type, visible, child count).
examples:
  figma-axi node abc123XYZ --ids 1:23,1:45`;

const nodeSchema = [
  field("id"),
  field("name"),
  field("type"),
  custom("visible", (n) => (n.visible === false ? "no" : "yes")),
  custom("children", (n) => (Array.isArray(n.children) ? n.children.length : 0)),
];

export async function nodeCommand(args) {
  const fileKey = getPositional(args, 0);
  const idsFlag = getFlag(args, "--ids");
  if (!fileKey || !idsFlag)
    throw new AxiError("Usage: figma-axi node <file_key> --ids <id1,id2,...>", "VALIDATION_ERROR");
  const res = await client.get(`/files/${fileKey}/nodes`, { ids: idsFlag });
  const entries = Object.entries(res.nodes || {});
  const docs = entries.map(
    ([id, v]) => v?.document ?? { id, name: "(not found)", type: "unknown" },
  );
  return renderOutput([
    countLine(docs.length),
    renderList("nodes", docs, nodeSchema),
    renderHelp([
      `Run \`figma-axi image ${fileKey} --ids ${idsFlag}\` for export URLs of these nodes`,
    ]),
  ]);
}
