import { client } from "../client.js";
import { resolveWorkspaceId } from "../context.js";
import { AxiError } from "../errors.js";
import { getFlag, getPositional, hasFlag } from "../args.js";
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

export const TIME_HELP = `usage: clickup-axi time <subcommand> [flags]
subcommands[5]:
  current                    show the currently running timer, if any
  start <task_id>            start a timer on a task
  stop                       stop the currently running timer
  log <task_id>              log a completed duration against a task
  list                       list recent time entries (default, most recent first)
flags{start}:
  --desc <text>, --billable
flags{log}:
  --duration <1h30m|90m> (required), --desc <text>, --billable,
  --start <ISO datetime> (default: now minus duration)
flags{list}:
  --start <ISO date>, --end <ISO date>, --limit <n> (default 50)
examples:
  clickup-axi time start 86b1abcde --desc "Client call"
  clickup-axi time stop
  clickup-axi time current
  clickup-axi time log 86b1abcde --duration 1h30m --desc "Drafted proposal"
  clickup-axi time list --start 2026-07-01`;

const entrySchema = [
  field("id"),
  custom("task", (e) => e.task?.name ?? e.task_id ?? e.tid ?? "none"),
  custom("desc", (e) => e.description || "none"),
  custom("duration", (e) => formatDuration(Number(e.duration))),
  custom("start", (e) => relMs(e.start)),
  custom("billable", (e) => (e.billable ? "yes" : "no")),
];

// ClickUp represents a still-running timer as a negative duration.
function formatDuration(ms) {
  if (!ms || isNaN(ms)) return "0m";
  const running = ms < 0;
  const abs = Math.abs(ms);
  const totalMin = Math.round(abs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const label = h > 0 ? `${h}h${m ? m + "m" : ""}` : `${m}m`;
  return running ? `${label} (running)` : label;
}

function parseDuration(s) {
  if (!s) return undefined;
  const m = s.match(/^(?:(\d+)h)?(?:(\d+)m)?$/i);
  if (!m || (!m[1] && !m[2])) return undefined;
  return (Number(m[1] || 0) * 60 + Number(m[2] || 0)) * 60000;
}

async function timeCurrent(ctx) {
  const workspaceId = await resolveWorkspaceId(ctx);
  const res = await client.get(`/team/${workspaceId}/time_entries/current`);
  const entry = res?.data;
  if (!entry) {
    return renderOutput([
      "running: no",
      renderHelp(["Run `clickup-axi time start <task_id>` to start one"]),
    ]);
  }
  return renderOutput([
    "running: yes",
    renderDetail("entry", entry, entrySchema),
    renderHelp(["Run `clickup-axi time stop` to stop it"]),
  ]);
}

async function timeStart(args, ctx) {
  const taskId = getPositional(args, 0);
  if (!taskId)
    throw new AxiError("Missing task_id", "VALIDATION_ERROR", [
      "Usage: clickup-axi time start <task_id>",
    ]);
  const workspaceId = await resolveWorkspaceId(ctx);
  const body = {
    tid: taskId,
    description: getFlag(args, "--desc") || "",
    billable: hasFlag(args, "--billable"),
  };
  const res = await client.post(`/team/${workspaceId}/time_entries/start`, body);
  return renderOutput([
    "started: yes",
    renderDetail("entry", res?.data ?? res, entrySchema),
    renderHelp(["Run `clickup-axi time stop` when done"]),
  ]);
}

async function timeStop(ctx) {
  const workspaceId = await resolveWorkspaceId(ctx);
  const res = await client.post(`/team/${workspaceId}/time_entries/stop`, {});
  return renderOutput(["stopped: yes", renderDetail("entry", res?.data ?? res, entrySchema)]);
}

async function timeLog(args, ctx) {
  const taskId = getPositional(args, 0);
  const durationStr = getFlag(args, "--duration");
  if (!taskId || !durationStr)
    throw new AxiError("time log needs <task_id> and --duration", "VALIDATION_ERROR", [
      "Usage: clickup-axi time log <task_id> --duration 1h30m",
    ]);
  const duration = parseDuration(durationStr);
  if (!duration)
    throw new AxiError(`Invalid --duration "${durationStr}"`, "VALIDATION_ERROR", [
      "Use a form like 1h30m, 45m, or 2h",
    ]);
  const workspaceId = await resolveWorkspaceId(ctx);
  const startFlag = getFlag(args, "--start");
  const start = startFlag ? Date.parse(startFlag) : Date.now() - duration;
  const body = {
    tid: taskId,
    start,
    duration,
    description: getFlag(args, "--desc") || "",
    billable: hasFlag(args, "--billable"),
  };
  const res = await client.post(`/team/${workspaceId}/time_entries`, body);
  return renderOutput(["logged: yes", renderDetail("entry", res?.data ?? res, entrySchema)]);
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

async function timeList(args, ctx) {
  const workspaceId = await resolveWorkspaceId(ctx);
  const limit = Number(getFlag(args, "--limit")) || 50;
  const startFlag = getFlag(args, "--start");
  const endFlag = getFlag(args, "--end");
  // The API doesn't guarantee recency ordering or a bounded default window,
  // so without explicit bounds an unbounded query can surface old entries
  // ahead of new ones. Default to the last 30 days and sort client-side.
  const query = {
    start_date: startFlag ? Date.parse(startFlag) : Date.now() - THIRTY_DAYS_MS,
    end_date: endFlag ? Date.parse(endFlag) : undefined,
  };
  const res = await client.get(`/team/${workspaceId}/time_entries`, query);
  const entries = (res?.data || [])
    .slice()
    .sort((a, b) => Number(b.start) - Number(a.start))
    .slice(0, limit);
  return renderOutput([
    countLine(entries.length),
    entries.length ? renderList("entries", entries, entrySchema) : "entries: none",
    renderHelp(['Run `clickup-axi time log <task_id> --duration 1h` to add a past entry']),
  ]);
}

export async function timeCommand(args, ctx) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "current":
      return timeCurrent(ctx);
    case "start":
      return timeStart(rest, ctx);
    case "stop":
      return timeStop(ctx);
    case "log":
      return timeLog(rest, ctx);
    case "list":
    case undefined:
      return timeList(rest, ctx);
    default:
      throw new AxiError(`Unknown time subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Subcommands: current, start <task_id>, stop, log <task_id>, list",
      ]);
  }
}
