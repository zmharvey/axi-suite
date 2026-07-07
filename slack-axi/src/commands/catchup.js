// Multi-channel sweep: recent messages across the channels you're in, since a
// time window — "what did I miss." One command instead of N reads.
import { slack } from "../client.js";
import { getFlag } from "../args.js";
import { custom, renderList, renderHelp, renderOutput, countLine, relTs, oneLine } from "../toon.js";

export const CATCHUP_HELP = `usage: slack-axi catchup [flags]
Sweep recent messages across your channels since a time window ("what did I miss").
flags:
  --since <n><m|h|d|w>   window back from now (default 1d)
  --channels "#a,#b"     limit to specific channels (default: channels you're in)
  --limit <n>            max messages per channel (default 10)
examples:
  slack-axi catchup --since 12h
  slack-axi catchup --channels "#general,#random" --since 2d`;

function parseSince(s) {
  const m = /^(\d+)([mhdw])$/.exec((s || "1d").trim());
  if (!m) return 86400;
  return Number(m[1]) * { m: 60, h: 3600, d: 86400, w: 604800 }[m[2]];
}

const msgSchema = [
  custom("from", (m) => m.user || m.username || m.bot_id || "?"),
  custom("when", (m) => relTs(m.ts)),
  custom("text", (m) => oneLine(m.text, 140)),
];

export async function catchupCommand(args) {
  const sinceLabel = getFlag(args, "--since") || "1d";
  const cutoff = (Date.now() / 1000 - parseSince(sinceLabel)).toFixed(6);
  const perCh = Number(getFlag(args, "--limit")) || 10;
  const chFilter = getFlag(args, "--channels");

  const all = (await slack.get("conversations.list", { types: "public_channel,private_channel", exclude_archived: true, limit: 1000 })).channels || [];
  let channels;
  if (chFilter) {
    const names = chFilter.split(",").map((s) => s.trim().replace(/^#/, "").toLowerCase());
    channels = all.filter((c) => names.includes((c.name || "").toLowerCase()));
  } else {
    channels = all.filter((c) => c.is_member !== false);
  }

  const blocks = [];
  let total = 0;
  for (const ch of channels) {
    let res;
    try {
      res = await slack.get("conversations.history", { channel: ch.id, oldest: cutoff, limit: perCh });
    } catch {
      continue;
    }
    const msgs = (res.messages || []).filter((m) => m.type === "message" && !m.subtype);
    if (!msgs.length) continue;
    total += msgs.length;
    blocks.push(renderList(`#${ch.name} (${msgs.length})`, msgs, msgSchema));
  }
  return renderOutput([
    countLine(total) + ` new across ${blocks.length} channels (last ${sinceLabel})`,
    ...(blocks.length ? blocks : ["messages: none in window"]),
    renderHelp(["Run `slack-axi read <#channel>` for full context", "Run `slack-axi thread <#channel> <ts>` for a thread"]),
  ]);
}
