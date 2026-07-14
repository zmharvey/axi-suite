import { getFlag } from "../args.js";
import { field, custom, oneLine } from "../toon.js";

export const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/** Read --calendar, defaulting to the user's primary calendar. */
export function calendarIdFlag(args) {
  return getFlag(args, "--calendar") || "primary";
}

function pad(n) {
  return String(n).padStart(2, "0");
}

/** Format an ISO-8601 datetime as a local, human-readable "YYYY-MM-DD HH:MM". */
function formatLocal(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Relative time from an ISO-8601 string, in either direction — Calendar
 * events skew future ("in 2h") as often as past, unlike Drive/Gmail
 * timestamps (always past), so this can't reuse toon.js's `relIso`/`relMs`.
 * @param {string} iso - An ISO-8601 timestamp.
 * @returns {string} A relative label like "in 2h" or "3d ago".
 */
export function relIso(iso) {
  if (!iso) return "unknown";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "unknown";
  const diffSec = Math.round((t - Date.now()) / 1000);
  const past = diffSec < 0;
  const sec = Math.abs(diffSec);
  if (sec < 60) return past ? "just now" : "in a moment";
  const suffix = past ? "ago" : "from now";
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${suffix}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${suffix}`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ${suffix}`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ${suffix}`;
  return `${Math.floor(mo / 12)}y ${suffix}`;
}

/** Render a Calendar `start`/`end` time object (`{ dateTime }` or `{ date }`). */
export function eventTimeLabel(t) {
  if (!t) return "unknown";
  if (t.dateTime) return `${formatLocal(t.dateTime)} (${relIso(t.dateTime)})`;
  if (t.date) return `${t.date} (all-day)`;
  return "unknown";
}

export const eventSchema = [
  field("id"),
  custom("summary", (e) => oneLine(e.summary || "(no title)", 80)),
  custom("start", (e) => eventTimeLabel(e.start)),
  custom("end", (e) => eventTimeLabel(e.end)),
  custom("location", (e) => (e.location ? oneLine(e.location, 60) : "")),
  custom("attendees", (e) => (e.attendees?.length ? String(e.attendees.length) : "none")),
];

export const calendarSchema = [
  field("id"),
  custom("summary", (c) => oneLine(c.summary || c.id, 60)),
  custom("primary", (c) => (c.primary ? "yes" : "no")),
];

/**
 * Attach a system-local IANA timeZone to a `{ dateTime }` object when the
 * caller's ISO string has no UTC offset — the Calendar API otherwise
 * rejects a bare-local `dateTime` with no way to resolve it.
 * @param {string} iso - The ISO-8601 datetime as provided on the command line.
 * @returns {{dateTime: string, timeZone?: string}} A Calendar API time object.
 */
export function toEventTime(iso) {
  const hasOffset = /Z$|[+-]\d{2}:?\d{2}$/.test(iso);
  return hasOffset ? { dateTime: iso } : { dateTime: iso, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
}

/** ISO bounds for the local calendar day containing `now`. */
export function todayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}
