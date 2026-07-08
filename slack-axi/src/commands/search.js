import { slack } from "../client.js";
import { getFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { custom, renderList, renderHelp, renderOutput, countLine, relTs, oneLine } from "../toon.js";

export const SEARCH_HELP = `usage: slack-axi search "<query>" [flags]
Search messages across channels + DMs you can see (Slack search operators work).
flags:
  --limit <n>   results to return (default 20)
examples:
  slack-axi search "deploy failed in:#eng"
  slack-axi search "from:@jane budget" --limit 30`;

const fileSummary = (m) =>
  (m.files || [])
    .map((f) => `${f.id}:${f.name || f.title || "?"} (${f.permalink || "no link"})`)
    .join(" | ") || "none";

const schema = [
  custom("channel", (m) => (m.channel?.name ? "#" + m.channel.name : m.channel?.id || "?")),
  custom("channel_id", (m) => m.channel?.id || ""),
  custom("from", (m) => m.username || m.user || "?"),
  custom("when", (m) => relTs(m.ts)),
  custom("files", fileSummary),
  custom("text", (m) => oneLine(m.text, 140)),
];

export async function searchCommand(args) {
  const explicit = getFlag(args, "--query");
  const count = Number(getFlag(args, "--limit")) || 20;
  // Build the query from positionals only — skip flags AND their values
  // (so `search "foo" --limit 5` doesn't search for "foo 5").
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--limit" || a === "--query") {
      i++;
      continue;
    }
    if (a.startsWith("--")) continue;
    positional.push(a);
  }
  const query = explicit || positional.join(" ").trim();
  if (!query)
    throw new AxiError('Missing query. Usage: slack-axi search "<text>"', "VALIDATION_ERROR");
  const res = await slack.get("search.messages", { query, count, sort: "timestamp" });
  const matches = res.messages?.matches || [];
  const total = res.messages?.total ?? matches.length;
  return renderOutput([
    countLine(total, matches.length < total ? `showing ${matches.length}` : undefined),
    renderList("matches", matches, schema),
    renderHelp([
      "Run `slack-axi read <channel_id> --limit 20` to see surrounding context",
      "If a result has files, use its channel_id with `read` to see them there too",
    ]),
  ]);
}
