import { listTeams, resolveMe } from "../context.js";
import {
  field,
  custom,
  renderList,
  renderHelp,
  renderOutput,
  countLine,
} from "../toon.js";

const workspaceSchema = [
  field("id"),
  field("name"),
  custom("members", (t) => (t.members ? t.members.length : "?")),
];

export async function homeCommand() {
  const [me, teams] = await Promise.all([
    resolveMe().catch(() => null),
    listTeams(),
  ]);

  const blocks = [];
  if (me) blocks.push(renderOutput([`you: ${me.username} <${me.email}>`]));
  blocks.push(countLine(teams.length) + " workspaces");
  blocks.push(renderList("workspaces", teams, workspaceSchema));
  blocks.push(
    renderHelp([
      "Run `clickup-axi space list` to see spaces in your workspace",
      "Run `clickup-axi space view <space_id>` to find list ids",
      "Run `clickup-axi task list --list <list_id>` to see tasks",
      "Run `clickup-axi search --assignee me` for your open tasks",
    ]),
  );
  return renderOutput(blocks);
}
