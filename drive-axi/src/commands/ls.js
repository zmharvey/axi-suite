import { listFiles, fileSchema } from "./util.js";
import { getFlag } from "../args.js";
import { renderList, renderHelp, renderOutput, countLine } from "../toon.js";

export async function lsCommand(args) {
  const folder = getFlag(args, "--folder") || "root";
  const limit = Number(getFlag(args, "--limit")) || 50;
  const files = await listFiles(`'${folder}' in parents and trashed=false`, {
    pageSize: limit,
    orderBy: "folder,name",
  });
  return renderOutput([
    countLine(files.length) + (folder === "root" ? " in My Drive root" : ` in folder ${folder}`),
    renderList("files", files, fileSchema),
    renderHelp(["Pass a folder's id (from the id column) as --folder to descend into it"]),
  ]);
}
