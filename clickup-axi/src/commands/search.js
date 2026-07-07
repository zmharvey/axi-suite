import { client } from "../client.js";
import { resolveWorkspaceId, resolveMe } from "../context.js";
import { getFlag, hasFlag } from "../args.js";
import {
  field,
  custom,
  renderList,
  renderHelp,
  renderOutput,
  countLine,
  relMs,
} from "../toon.js";

export const SEARCH_HELP = `usage: clickup-axi search [flags]
Filter tasks across the whole workspace (ClickUp's filtered team-tasks view).
flags:
  --assignee <me|user_id>    filter by assignee
  --status <name>            filter by status (repeat --status for several)
  --contains <text>          client-side filter on task name (case-insensitive)
  --include-closed           include closed tasks
  --limit <n>                default 50
  -W/--workspace <id>        target workspace
examples:
  clickup-axi search --assignee me
  clickup-axi search --status "in progress" --contains proposal
  clickup-axi search --assignee me --include-closed`;

const resultSchema = [
  field("id"),
  field("name"),
  custom("status", (t) => t.status?.status ?? "none"),
  custom("assignees", (t) =>
    (t.assignees || []).map((a) => a.username).filter(Boolean).join(",") || "none",
  ),
  custom("list", (t) => t.list?.name ?? "none"),
  custom("updated", (t) => relMs(t.date_updated)),
];

export async function searchCommand(args, ctx) {
  const workspaceId = await resolveWorkspaceId(ctx);
  const limit = Number(getFlag(args, "--limit")) || 50;
  const contains = (getFlag(args, "--contains") || "").toLowerCase();

  let assignee = getFlag(args, "--assignee");
  if (assignee === "me") assignee = String((await resolveMe()).id);

  const statuses = [];
  // support repeated --status
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--status" && args[i + 1]) statuses.push(args[i + 1]);
    else if (args[i].startsWith("--status=")) statuses.push(args[i].slice(9));
  }

  const tasks = [];
  let page = 0;
  while (tasks.length < limit * 2 && page <= 20) {
    const res = await client.get(`/team/${workspaceId}/task`, {
      page,
      order_by: "updated",
      include_closed: hasFlag(args, "--include-closed"),
      assignees: assignee ? [assignee] : undefined,
      statuses: statuses.length ? statuses : undefined,
    });
    const batch = res.tasks || [];
    tasks.push(...batch);
    if (res.last_page === true || batch.length < 100) break;
    page++;
  }

  let filtered = tasks;
  if (contains) {
    filtered = tasks.filter((t) => (t.name || "").toLowerCase().includes(contains));
  }
  const shown = filtered.slice(0, limit);

  return renderOutput([
    countLine(shown.length, filtered.length > limit ? `showing first ${limit}` : undefined),
    renderList("results", shown, resultSchema),
    renderHelp([
      "Run `clickup-axi task view <task_id>` for full detail",
      "Add `--contains <text>` to narrow by name, or `--status <name>` to filter",
    ]),
  ]);
}
