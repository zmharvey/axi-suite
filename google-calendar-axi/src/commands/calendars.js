import { gfetch } from "../google-auth.js";
import { AxiError } from "../errors.js";
import { renderList, renderHelp, renderOutput, countLine } from "../toon.js";
import { CALENDAR_API, calendarSchema } from "./util.js";

export const CALENDARS_HELP = `usage: google-calendar-axi calendars <subcommand>
subcommands[1]:
  list (default)   calendars you have access to
examples:
  google-calendar-axi calendars list`;

async function calendarsList() {
  const res = await gfetch(`${CALENDAR_API}/users/me/calendarList`);
  const calendars = res.items || [];
  return renderOutput([
    countLine(calendars.length),
    calendars.length ? renderList("calendars", calendars, calendarSchema) : "calendars: none",
    renderHelp(["Pass a calendar's id as --calendar to `events list`/`view`/`create`/`delete`"]),
  ]);
}

export async function calendarsCommand(args) {
  const sub = args[0];
  switch (sub) {
    case "list":
    case undefined:
      return calendarsList();
    default:
      throw new AxiError(`Unknown calendars subcommand: ${sub}`, "VALIDATION_ERROR", ["Subcommands: list"]);
  }
}
