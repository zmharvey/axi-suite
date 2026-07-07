import { gfetch } from "../google-auth.js";
import { API, getMeta, header } from "./util.js";
import { getFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { custom, renderList, renderHelp, renderOutput, countLine, relMs, oneLine } from "../toon.js";

export const SEARCH_HELP = `usage: gmail-axi search "<gmail query>" [--limit n]
Uses Gmail's own search syntax.
examples:
  gmail-axi search "from:jane is:unread"
  gmail-axi search "invoice newer_than:30d" --limit 20`;

const schema = [
  custom("id", (m) => m.id),
  custom("from", (m) => oneLine(header(m, "From"), 36)),
  custom("subject", (m) => oneLine(header(m, "Subject"), 50)),
  custom("when", (m) => relMs(m.internalDate)),
  custom("snippet", (m) => oneLine(m.snippet, 70)),
];

export async function searchCommand(args) {
  const limit = Number(getFlag(args, "--limit")) || 12;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--limit") {
      i++;
      continue;
    }
    if (a.startsWith("--")) continue;
    positional.push(a);
  }
  const query = positional.join(" ").trim();
  if (!query)
    throw new AxiError('Missing query. Usage: gmail-axi search "<gmail query>"', "VALIDATION_ERROR");
  const list = await gfetch(`${API}/messages?q=${encodeURIComponent(query)}&maxResults=${limit}`);
  const ids = (list.messages || []).map((m) => m.id);
  const metas = await Promise.all(ids.map(getMeta));
  const est = list.resultSizeEstimate ?? metas.length;
  return renderOutput([
    countLine(est, metas.length < est ? `showing ${metas.length}` : undefined),
    renderList("messages", metas, schema),
    renderHelp(["Run `gmail-axi read <id>` for the full message"]),
  ]);
}
