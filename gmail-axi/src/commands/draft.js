import { gfetch } from "../google-auth.js";
import { API } from "./util.js";
import { getFlag, hasFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { renderOutput, renderHelp } from "../toon.js";

export const DRAFT_HELP = `usage: gmail-axi draft --to <email> --subject "..." --body "..." [--confirm]
Creates a Gmail DRAFT. It is never sent — there is no send command. Draft-first:
without --confirm it only shows what would be drafted.`;

function b64url(s) {
  return Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function draftCommand(args) {
  const to = getFlag(args, "--to");
  const subject = getFlag(args, "--subject") || "";
  const body = getFlag(args, "--body") || "";
  if (!to)
    throw new AxiError(
      'Usage: gmail-axi draft --to <email> --subject "..." --body "..." [--confirm]',
      "VALIDATION_ERROR",
    );
  if (!hasFlag(args, "--confirm")) {
    return renderOutput([
      "dry-run: would create a DRAFT (never sent)",
      `to: ${to}`,
      `subject: ${subject}`,
      `body: ${body}`,
      renderHelp(["Re-run with --confirm to save the draft; it still won't send automatically"]),
    ]);
  }
  const raw = b64url(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`,
  );
  const res = await gfetch(`${API}/drafts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw } }),
  });
  return renderOutput([
    "draft created: yes (not sent)",
    `draft id: ${res.id}`,
    `message id: ${res.message?.id ?? "?"}`,
    renderHelp(["Open Gmail → Drafts to review and send it yourself"]),
  ]);
}
