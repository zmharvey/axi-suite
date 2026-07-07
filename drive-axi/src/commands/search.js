import { listFiles, fileSchema, esc } from "./util.js";
import { getFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { renderList, renderHelp, renderOutput, countLine } from "../toon.js";

export async function searchCommand(args) {
  const limit = Number(getFlag(args, "--limit")) || 20;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--limit") {
      i++;
      continue;
    }
    if (a.startsWith("--")) continue;
    positional.push(a);
  }
  const query = positional.join(" ").trim();
  if (!query)
    throw new AxiError('Missing query. Usage: drive-axi search "<text>"', "VALIDATION_ERROR");
  const q = `(name contains '${esc(query)}' or fullText contains '${esc(query)}') and trashed=false`;
  const files = await listFiles(q, { pageSize: limit });
  return renderOutput([
    countLine(files.length),
    renderList("files", files, fileSchema),
    renderHelp(["Run `drive-axi read <file_id>` to read a file's text"]),
  ]);
}
