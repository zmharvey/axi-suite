import { slack } from "../client.js";
import { resolveChannelId } from "../context.js";
import { getFlag, getPositional, hasFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { custom, renderList, renderHelp, renderOutput, countLine, relTs, oneLine } from "../toon.js";

const msgSchema = [
  custom("from", (m) => m.user || m.username || m.bot_id || "?"),
  custom("when", (m) => relTs(m.ts)),
  custom("ts", (m) => m.ts),
  custom("replies", (m) => (m.reply_count ? String(m.reply_count) : "")),
  custom("text", (m) => oneLine(m.text, 160)),
];

export async function readCommand(args) {
  const ch = getPositional(args, 0);
  if (!ch) throw new AxiError("Usage: slack-axi read <#channel|id> [--limit n]", "VALIDATION_ERROR");
  const id = await resolveChannelId(ch);
  const limit = Number(getFlag(args, "--limit")) || 20;
  const res = await slack.get("conversations.history", { channel: id, limit });
  const msgs = res.messages || [];
  const blocks = [countLine(msgs.length) + ` in ${ch}`, renderList("messages", msgs, msgSchema)];

  // --threads: inline replies under threaded parents (opt-in; costs one call each).
  if (hasFlag(args, "--threads")) {
    const parents = msgs.filter((m) => m.reply_count > 0).slice(0, 5);
    for (const p of parents) {
      const r = await slack.get("conversations.replies", { channel: id, ts: p.thread_ts || p.ts });
      const replies = (r.messages || []).slice(1); // drop the parent
      if (replies.length) blocks.push(renderList(`replies to ${p.ts} (${p.reply_count})`, replies, msgSchema));
    }
  } else {
    blocks.push(renderHelp([`Run \`slack-axi thread ${ch} <ts>\` (or add --threads) to read replies`]));
  }
  return renderOutput(blocks);
}

export async function threadCommand(args) {
  const pos = args.filter((a) => !a.startsWith("-"));
  const ch = pos[0];
  const ts = pos[1] || getFlag(args, "--ts");
  if (!ch || !ts)
    throw new AxiError("Usage: slack-axi thread <#channel|id> <ts>", "VALIDATION_ERROR");
  const id = await resolveChannelId(ch);
  const res = await slack.get("conversations.replies", { channel: id, ts });
  const msgs = res.messages || [];
  return renderOutput([countLine(msgs.length) + " in thread", renderList("thread", msgs, msgSchema)]);
}
