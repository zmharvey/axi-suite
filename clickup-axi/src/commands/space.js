import { client } from "../client.js";
import { resolveWorkspaceId } from "../context.js";
import { AxiError } from "../errors.js";
import { getPositional } from "../args.js";
import {
  field,
  custom,
  boolYesNo,
  renderList,
  renderHelp,
  renderOutput,
  countLine,
} from "../toon.js";

export const SPACE_HELP = `usage: clickup-axi space <subcommand> [flags]
subcommands[2]:
  list                       list spaces in the workspace
  view <space_id>            show folders + lists inside a space (to find list ids)
flags:
  -W/--workspace <id>        target workspace (default: sole workspace or config)
examples:
  clickup-axi space list
  clickup-axi space view 90010012345`;

const spaceSchema = [
  field("id"),
  field("name"),
  boolYesNo("private", "private"),
  custom("statuses", (s) => (s.statuses ? s.statuses.length : 0)),
];

const listSchema = [
  field("id"),
  field("name"),
  custom("tasks", (l) => l.task_count ?? "?"),
];

async function spaceList(ctx) {
  const workspaceId = await resolveWorkspaceId(ctx);
  const { spaces = [] } = await client.get(`/team/${workspaceId}/space`, {
    archived: false,
  });
  return renderOutput([
    countLine(spaces.length),
    renderList("spaces", spaces, spaceSchema),
    renderHelp([
      "Run `clickup-axi space view <space_id>` to see its folders and lists",
    ]),
  ]);
}

async function spaceView(args) {
  const spaceId = getPositional(args, 0);
  if (!spaceId)
    throw new AxiError("Missing space_id", "VALIDATION_ERROR", [
      "Run `clickup-axi space list` to find space ids",
    ]);

  const [folderRes, listRes] = await Promise.all([
    client.get(`/space/${spaceId}/folder`, { archived: false }),
    client.get(`/space/${spaceId}/list`, { archived: false }),
  ]);
  const folders = folderRes.folders || [];
  const folderlessLists = listRes.lists || [];

  const blocks = [];
  // Lists nested under folders, flattened with a folder column.
  const nestedLists = [];
  for (const f of folders) {
    for (const l of f.lists || []) {
      nestedLists.push({ ...l, _folder: f.name });
    }
  }
  if (nestedLists.length) {
    blocks.push(
      renderList("folder_lists", nestedLists, [
        field("id"),
        custom("folder", (l) => l._folder),
        field("name"),
        custom("tasks", (l) => l.task_count ?? "?"),
      ]),
    );
  }
  if (folderlessLists.length) {
    blocks.push(renderList("lists", folderlessLists, listSchema));
  }
  if (!nestedLists.length && !folderlessLists.length) {
    blocks.push("lists: none");
  }
  blocks.push(
    renderHelp([
      "Run `clickup-axi task list --list <list_id>` to see a list's tasks",
      "Run `clickup-axi task create --list <list_id> --name \"...\"` to add a task",
    ]),
  );
  return renderOutput(blocks);
}

export async function spaceCommand(args, ctx) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "list":
    case "ls":
    case undefined:
      return spaceList(ctx);
    case "view":
      return spaceView(rest);
    default:
      throw new AxiError(`Unknown space subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Subcommands: list, view <space_id>",
      ]);
  }
}
