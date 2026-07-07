import { listFiles, fileSchema } from "./util.js";
import { renderList, renderHelp, renderOutput, countLine } from "../toon.js";

export async function homeCommand() {
  const files = await listFiles("trashed=false", { pageSize: 15 });
  return renderOutput([
    countLine(files.length) + " recent files",
    renderList("files", files, fileSchema),
    renderHelp([
      'Run `drive-axi search "<text>"` to find files by name or content',
      "Run `drive-axi read <file_id>` to read a doc's text",
      "Run `drive-axi ls [--folder <id>]` to browse folders",
    ]),
  ]);
}
