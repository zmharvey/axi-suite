import { client } from "../client.js";
import { resolveMe } from "../context.js";
import { AxiError } from "../errors.js";
import {
  getFlag,
  getPositional,
  hasFlag,
  getAllFlags,
} from "../args.js";
import {
  field,
  custom,
  renderList,
  renderDetail,
  renderHelp,
  renderOutput,
  countLine,
  relMs,
} from "../toon.js";

export const TASK_HELP = `usage: clickup-axi task <subcommand> [flags]
subcommands[5]:
  list                       list tasks in a list
  view <task_id>             show one task (add --comments for its comments)
  create                     create a task
  update <task_id>           update a task's fields
  comment <task_id>          add a comment
flags{list}:
  --list <list_id> (required), --status <name>, --assignee <me|user_id>,
  --include-closed, --no-subtasks, --limit <n> (default 50)
flags{view}:
  --comments, --full (untruncated description)
flags{create}:
  --list <list_id> (required), --name <text> (required), --desc <text>,
  --status <name>, --priority <urgent|high|normal|low>, --assignee <me|user_id> (repeatable)
flags{update}:
  --name, --desc, --status, --priority
flags{comment}:
  --text <text> (required)
examples:
  clickup-axi task list --list 901000123456 --assignee me
  clickup-axi task view 86b1abcde --comments
  clickup-axi task create --list 901000123456 --name "Draft proposal" --priority high
  clickup-axi task update 86b1abcde --status "in progress"
  clickup-axi task comment 86b1abcde --text "Shipped, ready for review"`;

const listSchema = [
  field("id"),
  field("name"),
  custom("status", (t) => t.status?.status ?? "none"),
  custom("assignees", (t) =>
    (t.assignees || []).map((a) => a.username).filter(Boolean).join(",") || "none",
  ),
  custom("priority", (t) => t.priority?.priority ?? "none"),
  custom("due", (t) => (t.due_date ? relMs(t.due_date) : "none")),
  custom("updated", (t) => relMs(t.date_updated)),
];

const viewSchema = [
  field("id"),
  field("name"),
  custom("status", (t) => t.status?.status ?? "none"),
  custom("assignees", (t) =>
    (t.assignees || []).map((a) => a.username).filter(Boolean).join(",") || "none",
  ),
  custom("priority", (t) => t.priority?.priority ?? "none"),
  custom("due", (t) => (t.due_date ? relMs(t.due_date) : "none")),
  custom("list", (t) => t.list?.name ?? "none"),
  custom("updated", (t) => relMs(t.date_updated)),
  field("url"),
];

const DESC_LIMIT = 500;

async function resolveAssignee(v) {
  if (!v) return undefined;
  if (v === "me") return String((await resolveMe()).id);
  return v;
}

/** Page through a task endpoint up to `limit` results. */
async function fetchTasks(path, baseQuery, limit) {
  const tasks = [];
  let page = 0;
  while (tasks.length < limit) {
    const res = await client.get(path, { ...baseQuery, page });
    const batch = res.tasks || [];
    tasks.push(...batch);
    if (res.last_page === true || batch.length < 100) break;
    page++;
    if (page > 50) break;
  }
  const truncated = tasks.length > limit;
  return { tasks: tasks.slice(0, limit), truncated };
}

async function taskList(args) {
  const listId = getFlag(args, "--list");
  if (!listId)
    throw new AxiError("Missing --list <list_id>", "VALIDATION_ERROR", [
      "Run `clickup-axi space view <space_id>` to find list ids",
    ]);
  const limit = Number(getFlag(args, "--limit")) || 50;
  const assignee = await resolveAssignee(getFlag(args, "--assignee"));
  const query = {
    archived: false,
    include_closed: hasFlag(args, "--include-closed"),
    // Include subtasks by default (matches ClickUp's API + avoids silent
    // undercounts); opt out with --no-subtasks for a leaner top-level view.
    subtasks: !hasFlag(args, "--no-subtasks"),
    order_by: "updated",
    statuses: getFlag(args, "--status") ? [getFlag(args, "--status")] : undefined,
    assignees: assignee ? [assignee] : undefined,
  };
  const { tasks, truncated } = await fetchTasks(
    `/list/${listId}/task`,
    query,
    limit,
  );
  return renderOutput([
    countLine(tasks.length, truncated ? `showing first ${limit}` : undefined),
    renderList("tasks", tasks, listSchema),
    renderHelp([
      "Run `clickup-axi task view <task_id>` for full detail",
      `Run \`clickup-axi task create --list ${listId} --name "..."\` to add a task`,
    ]),
  ]);
}

async function taskView(args) {
  const taskId = getPositional(args, 0);
  if (!taskId) throw new AxiError("Missing task_id", "VALIDATION_ERROR");
  const task = await client.get(`/task/${taskId}`);

  const blocks = [renderDetail("task", task, viewSchema)];

  const desc = (task.description || task.text_content || "").trim();
  if (desc) {
    const full = hasFlag(args, "--full");
    const shown =
      !full && desc.length > DESC_LIMIT
        ? `${desc.slice(0, DESC_LIMIT)}... [+${desc.length - DESC_LIMIT} chars, use --full]`
        : desc;
    blocks.push(`description: |\n${shown.split("\n").map((l) => `  ${l}`).join("\n")}`);
  }

  if (hasFlag(args, "--comments")) {
    const { comments = [] } = await client.get(`/task/${taskId}/comment`);
    blocks.push(countLine(comments.length) + " comments");
    blocks.push(
      renderList("comments", comments, [
        custom("by", (c) => c.user?.username ?? "unknown"),
        custom("when", (c) => relMs(c.date)),
        custom("text", (c) =>
          (c.comment_text || "").replace(/\n/g, " ").slice(0, 120),
        ),
      ]),
    );
  }

  blocks.push(
    renderHelp([
      `Run \`clickup-axi task comment ${taskId} --text "..."\` to comment`,
      `Run \`clickup-axi task update ${taskId} --status "..."\` to change status`,
    ]),
  );
  return renderOutput(blocks);
}

async function taskCreate(args) {
  const listId = getFlag(args, "--list");
  const name = getFlag(args, "--name");
  if (!listId || !name)
    throw new AxiError("task create needs --list and --name", "VALIDATION_ERROR");
  const assignees = [];
  for (const a of getAllFlags(args, "--assignee")) {
    assignees.push(await resolveAssignee(a));
  }
  const body = {
    name,
    description: getFlag(args, "--desc"),
    status: getFlag(args, "--status"),
    priority: mapPriority(getFlag(args, "--priority")),
    assignees: assignees.length ? assignees.map(Number) : undefined,
  };
  const task = await client.post(`/list/${listId}/task`, prune(body));
  return renderOutput([
    "created: yes",
    renderDetail("task", task, viewSchema),
    renderHelp([`Run \`clickup-axi task view ${task.id}\` to see it`]),
  ]);
}

async function taskUpdate(args) {
  const taskId = getPositional(args, 0);
  if (!taskId) throw new AxiError("Missing task_id", "VALIDATION_ERROR");
  const body = prune({
    name: getFlag(args, "--name"),
    description: getFlag(args, "--desc"),
    status: getFlag(args, "--status"),
    priority: mapPriority(getFlag(args, "--priority")),
  });
  if (Object.keys(body).length === 0)
    throw new AxiError("Nothing to update", "VALIDATION_ERROR", [
      "Pass at least one of --name, --desc, --status, --priority",
    ]);
  let task;
  try {
    task = await client.put(`/task/${taskId}`, body);
  } catch (e) {
    // On a status error, fetch the task's valid statuses and suggest them.
    if (body.status && /status/i.test(e.message)) {
      try {
        const t = await client.get(`/task/${taskId}`);
        const listId = t.list?.id;
        const list = listId ? await client.get(`/list/${listId}`) : null;
        const valid = (list?.statuses || []).map((s) => s.status).filter(Boolean);
        if (valid.length)
          throw new AxiError(`Invalid status "${body.status}"`, "VALIDATION_ERROR", [
            `Valid statuses for this list: ${valid.join(", ")}`,
          ]);
      } catch (inner) {
        if (inner.code === "VALIDATION_ERROR") throw inner;
      }
    }
    throw e;
  }
  return renderOutput([
    "updated: yes",
    renderDetail("task", task, viewSchema),
  ]);
}

async function taskComment(args) {
  const taskId = getPositional(args, 0);
  const text = getFlag(args, "--text");
  if (!taskId || !text)
    throw new AxiError("task comment needs <task_id> and --text", "VALIDATION_ERROR");
  const res = await client.post(`/task/${taskId}/comment`, {
    comment_text: text,
    notify_all: false,
  });
  return renderOutput([
    "commented: yes",
    `id: ${res.id ?? "unknown"}`,
    renderHelp([`Run \`clickup-axi task view ${taskId} --comments\` to see it`]),
  ]);
}

function mapPriority(p) {
  if (!p) return undefined;
  const map = { urgent: 1, high: 2, normal: 3, low: 4 };
  return map[p.toLowerCase()] ?? undefined;
}

function prune(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

export async function taskCommand(args) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "list":
    case "ls":
      return taskList(rest);
    case "view":
    case "get":
      return taskView(rest);
    case "create":
    case "add":
      return taskCreate(rest);
    case "update":
    case "edit":
      return taskUpdate(rest);
    case "comment":
      return taskComment(rest);
    default:
      throw new AxiError(
        `Unknown task subcommand: ${sub ?? "(none)"}`,
        "VALIDATION_ERROR",
        ["Subcommands: list, view, create, update, comment"],
      );
  }
}
