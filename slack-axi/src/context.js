import { slack } from "./client.js";
import { AxiError } from "./errors.js";

let meCache;
export async function resolveMe() {
  if (!meCache) meCache = await slack.get("auth.test");
  return meCache;
}

let channelCache;
async function allChannels() {
  if (channelCache) return channelCache;
  const out = [];
  let cursor;
  do {
    const res = await slack.get("conversations.list", {
      types: "public_channel,private_channel",
      exclude_archived: true,
      limit: 1000,
      cursor,
    });
    out.push(...(res.channels || []));
    cursor = res.response_metadata?.next_cursor || "";
  } while (cursor && out.length < 5000);
  channelCache = out;
  return out;
}

/** Accept a channel id (C…/G…/D…) directly, or resolve a #name to its id. */
export async function resolveChannelId(nameOrId) {
  if (!nameOrId) throw new AxiError("Missing channel", "VALIDATION_ERROR");
  if (/^[CGD][A-Z0-9]{6,}$/.test(nameOrId)) return nameOrId;
  const name = nameOrId.replace(/^#/, "").toLowerCase();
  const match = (await allChannels()).find((c) => (c.name || "").toLowerCase() === name);
  if (!match)
    throw new AxiError(`Channel not found: ${nameOrId}`, "NOT_FOUND", [
      "Run `slack-axi channels` to list channels and their ids",
    ]);
  return match.id;
}
