import { gfetch } from "../google-auth.js";
import { API } from "./util.js";
import { renderOutput, renderHelp } from "../toon.js";

export async function homeCommand() {
  const p = await gfetch(`${API}/profile`);
  return renderOutput([
    `you: ${p.emailAddress}`,
    `messages: ${p.messagesTotal}  threads: ${p.threadsTotal}`,
    renderHelp([
      'Run `gmail-axi search "<gmail query>"` (e.g. "from:jane is:unread newer_than:7d")',
      "Run `gmail-axi read <message_id>` for a full message",
      "Run `gmail-axi thread <thread_id>` for a conversation",
      'Run `gmail-axi draft --to <email> --subject "..." --body "..."` (draft only — never sends)',
    ]),
  ]);
}
