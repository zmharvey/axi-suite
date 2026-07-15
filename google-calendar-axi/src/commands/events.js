import { gfetch } from "../google-auth.js";
import { getFlag, getPositional, hasFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { renderList, renderDetail, renderHelp, renderOutput, countLine, field, custom } from "../toon.js";
import { CALENDAR_API, calendarIdFlag, eventSchema, eventTimeLabel, toEventTime } from "./util.js";

export const EVENTS_HELP = `usage: google-calendar-axi events <subcommand> [args] [flags]
subcommands[4]:
  list (default) [--calendar <id>] [--days n]     upcoming events (default 7 days)
  view <event_id> [--calendar <id>]                full detail for one event
  create --summary "..." --start <ISO> --end <ISO>
    [--location "..."] [--description "..."] [--calendar <id>] [--confirm]
  delete <event_id> [--calendar <id>] [--confirm]
flags:
  --calendar <id>   defaults to "primary"
examples:
  google-calendar-axi events list --days 14
  google-calendar-axi events view abc123
  google-calendar-axi events create --summary "Standup" --start 2026-07-15T09:00:00 --end 2026-07-15T09:15:00 --confirm
  google-calendar-axi events delete abc123 --confirm`;

const detailSchema = [
  field("id"),
  field("summary"),
  custom("start", (e) => eventTimeLabel(e.start)),
  custom("end", (e) => eventTimeLabel(e.end)),
  custom("location", (e) => e.location || ""),
  custom("description", (e) => e.description || ""),
  custom("attendees", (e) => (e.attendees || []).map((a) => a.email).join(", ") || "none"),
  custom("htmlLink", (e) => e.htmlLink || ""),
];

async function eventsList(args) {
  const calendarId = calendarIdFlag(args);
  const days = Number(getFlag(args, "--days") || 7);
  const now = new Date();
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const u = new URL(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`);
  u.searchParams.set("timeMin", now.toISOString());
  u.searchParams.set("timeMax", end.toISOString());
  u.searchParams.set("singleEvents", "true");
  u.searchParams.set("orderBy", "startTime");
  const res = await gfetch(u.toString());
  const events = res.items || [];
  return renderOutput([
    countLine(events.length) + ` in the next ${days}d`,
    events.length ? renderList("events", events, eventSchema) : "events: none",
    renderHelp(["Run `events view <event_id>` for full detail"]),
  ]);
}

async function eventsView(args) {
  const calendarId = calendarIdFlag(args);
  const eventId = getPositional(args, 0);
  if (!eventId) throw new AxiError("Usage: google-calendar-axi events view <event_id>", "VALIDATION_ERROR");
  const res = await gfetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`);
  return renderOutput([renderDetail("event", res, detailSchema)]);
}

async function eventsCreate(args) {
  const calendarId = calendarIdFlag(args);
  const summary = getFlag(args, "--summary");
  const start = getFlag(args, "--start");
  const end = getFlag(args, "--end");
  const location = getFlag(args, "--location");
  const description = getFlag(args, "--description");
  if (!summary || !start || !end)
    throw new AxiError(
      'Usage: events create --summary "..." --start <ISO> --end <ISO> [--location "..."] [--description "..."] [--confirm]',
      "VALIDATION_ERROR",
    );
  const body = {
    summary,
    start: toEventTime(start),
    end: toEventTime(end),
    ...(location ? { location } : {}),
    ...(description ? { description } : {}),
  };
  if (!hasFlag(args, "--confirm")) {
    return renderOutput([
      "dry-run: would create this event",
      `summary: ${summary}`,
      `start: ${start}`,
      `end: ${end}`,
      ...(location ? [`location: ${location}`] : []),
      ...(description ? [`description: ${description}`] : []),
      `calendar: ${calendarId}`,
      renderHelp(["Re-run with --confirm to actually create it"]),
    ]);
  }
  const res = await gfetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return renderOutput([
    "created: yes",
    `event id: ${res.id}`,
    renderHelp([res.htmlLink ? `View: ${res.htmlLink}` : "Run `events view <event_id>` to see it"]),
  ]);
}

async function eventsDelete(args) {
  const calendarId = calendarIdFlag(args);
  const eventId = getPositional(args, 0);
  if (!eventId) throw new AxiError("Usage: google-calendar-axi events delete <event_id> [--confirm]", "VALIDATION_ERROR");
  if (!hasFlag(args, "--confirm")) {
    const existing = await gfetch(
      `${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    );
    return renderOutput([
      "dry-run: would delete this event",
      `id: ${existing.id}`,
      `summary: ${existing.summary || "(no title)"}`,
      `start: ${eventTimeLabel(existing.start)}`,
      renderHelp(["Re-run with --confirm to actually delete it"]),
    ]);
  }
  await gfetch(`${CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  return renderOutput(["deleted: yes", `event id: ${eventId}`]);
}

export async function eventsCommand(args) {
  const sub = args[0];
  switch (sub) {
    case "list":
      return eventsList(args.slice(1));
    case "view":
      return eventsView(args.slice(1));
    case "create":
      return eventsCreate(args.slice(1));
    case "delete":
      return eventsDelete(args.slice(1));
    case undefined:
      return eventsList(args.slice(1));
    default:
      throw new AxiError(`Unknown events subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Subcommands: list, view, create, delete",
      ]);
  }
}
