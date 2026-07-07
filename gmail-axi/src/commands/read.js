import { gfetch } from "../google-auth.js";
import { API, header, extractBody } from "./util.js";
import { getPositional, hasFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { custom, renderList, renderOutput, countLine, relMs, oneLine } from "../toon.js";

const LIMIT = 4000;

export async function readCommand(args) {
  const id = getPositional(args, 0);
  if (!id) throw new AxiError("Usage: gmail-axi read <message_id> [--full]", "VALIDATION_ERROR");
  const msg = await gfetch(`${API}/messages/${id}?format=full`);
  const body = extractBody(msg.payload);
  const full = hasFlag(args, "--full");
  const shown =
    !full && body.length > LIMIT
      ? `${body.slice(0, LIMIT)}\n... [+${body.length - LIMIT} chars, use --full]`
      : body;
  return renderOutput([
    `from: ${header(msg, "From")}`,
    `to: ${header(msg, "To")}`,
    `subject: ${header(msg, "Subject")}`,
    `date: ${header(msg, "Date")}`,
    "body: |",
    shown.split("\n").map((l) => "  " + l).join("\n"),
  ]);
}

export async function threadCommand(args) {
  const id = getPositional(args, 0);
  if (!id) throw new AxiError("Usage: gmail-axi thread <thread_id>", "VALIDATION_ERROR");
  const t = await gfetch(
    `${API}/threads/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
  );
  const msgs = t.messages || [];
  const schema = [
    custom("id", (m) => m.id),
    custom("from", (m) => oneLine(header(m, "From"), 36)),
    custom("when", (m) => relMs(m.internalDate)),
    custom("snippet", (m) => oneLine(m.snippet, 80)),
  ];
  return renderOutput([countLine(msgs.length) + " in thread", renderList("thread", msgs, schema)]);
}
