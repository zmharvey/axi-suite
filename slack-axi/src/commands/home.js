import { resolveMe } from "../context.js";
import { renderOutput, renderHelp } from "../toon.js";

export async function homeCommand() {
  const me = await resolveMe();
  return renderOutput([
    `you: ${me.user} @ ${me.team} (user ${me.user_id})`,
    renderHelp([
      'Run `slack-axi search "<query>"` to search messages',
      "Run `slack-axi channels` to list channels + ids",
      "Run `slack-axi read <#channel|id>` to read recent messages",
      'Run `slack-axi send <#channel> --text "..."` to post as you (dry-run without --confirm)',
    ]),
  ]);
}
