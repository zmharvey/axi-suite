import { slack } from "../client.js";
import { resolveChannelId } from "../context.js";
import { getFlag, getPositional, hasFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { renderOutput, renderHelp } from "../toon.js";

export const SEND_HELP = `usage: slack-axi send <#channel|id> --text "..." [--confirm]
Posts a message AS YOU (user token). Draft-first: without --confirm it only shows
what would be sent. Add --confirm to actually post.
examples:
  slack-axi send #general --text "Deploy is green"            # dry-run
  slack-axi send #general --text "Deploy is green" --confirm  # posts`;

export async function sendCommand(args) {
  const ch = getPositional(args, 0);
  const text = getFlag(args, "--text");
  if (!ch || !text)
    throw new AxiError('Usage: slack-axi send <#channel|id> --text "..." [--confirm]', "VALIDATION_ERROR");
  const id = await resolveChannelId(ch);

  // Write guard: never post without an explicit --confirm.
  if (!hasFlag(args, "--confirm")) {
    return renderOutput([
      "dry-run: would post (as you)",
      `channel: ${ch} (${id})`,
      `text: ${text}`,
      renderHelp(["Re-run with --confirm to actually post"]),
    ]);
  }

  const res = await slack.post("chat.postMessage", { channel: id, text });
  return renderOutput(["posted: yes", `channel: ${ch} (${id})`, `ts: ${res.ts}`]);
}
