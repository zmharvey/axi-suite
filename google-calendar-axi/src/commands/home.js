import { gfetch } from "../google-auth.js";
import { renderList, renderHelp, renderOutput, countLine } from "../toon.js";
import { CALENDAR_API, eventSchema, todayBounds } from "./util.js";

export async function homeCommand() {
  const { timeMin, timeMax } = todayBounds();
  const u = new URL(`${CALENDAR_API}/calendars/primary/events`);
  u.searchParams.set("timeMin", timeMin);
  u.searchParams.set("timeMax", timeMax);
  u.searchParams.set("singleEvents", "true");
  u.searchParams.set("orderBy", "startTime");
  const res = await gfetch(u.toString());
  const events = res.items || [];
  return renderOutput([
    countLine(events.length) + " today",
    events.length ? renderList("events", events, eventSchema) : "events: none",
    renderHelp([
      "Run `google-calendar-axi events list` to see the next 7 days",
      "Run `google-calendar-axi calendars list` to see other calendars",
      'Run `google-calendar-axi events create --summary "..." --start <ISO> --end <ISO>` to draft a new event',
    ]),
  ]);
}
