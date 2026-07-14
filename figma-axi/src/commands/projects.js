import { client } from "../client.js";
import { getPositional } from "../args.js";
import { AxiError } from "../errors.js";
import { field, renderList, renderHelp, renderOutput, countLine } from "../toon.js";

export const PROJECTS_HELP = `usage: figma-axi projects <project_id> files
Lists the files within a Figma project.
examples:
  figma-axi projects 987654321 files`;

const fileSchema = [field("key"), field("name"), field("last_modified")];

export async function projectsCommand(args) {
  const projectId = getPositional(args, 0);
  const sub = args[1];
  if (!projectId || sub !== "files")
    throw new AxiError("Usage: figma-axi projects <project_id> files", "VALIDATION_ERROR");
  const res = await client.get(`/projects/${projectId}/files`);
  const files = res.files || [];
  return renderOutput([
    countLine(files.length),
    renderList("files", files, fileSchema),
    renderHelp(["Run `figma-axi file <file_key>` for a file summary"]),
  ]);
}
