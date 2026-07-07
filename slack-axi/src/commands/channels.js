import { slack } from "../client.js";
import { getFlag } from "../args.js";
import { field, custom, boolYesNo, renderList, renderHelp, renderOutput, countLine, oneLine } from "../toon.js";

export async function channelsCommand(args) {
  const types = getFlag(args, "--types") || "public_channel,private_channel";
  const limit = Number(getFlag(args, "--limit")) || 100;
  // Paginate: conversations.list returns one page per call; follow the cursor
  // up to the requested limit so counts aren't silently truncated.
  const chs = [];
  let cursor;
  do {
    const res = await slack.get("conversations.list", {
      types,
      exclude_archived: true,
      limit: 200,
      cursor,
    });
    chs.push(...(res.channels || []));
    cursor = res.response_metadata?.next_cursor || "";
  } while (cursor && chs.length < limit);
  chs.length = Math.min(chs.length, limit);
  const schema = [
    field("id"),
    custom("name", (c) => "#" + (c.name || "")),
    boolYesNo("is_private", "private"),
    custom("members", (c) => c.num_members ?? "?"),
    custom("topic", (c) => oneLine(c.topic?.value || "", 60)),
  ];
  return renderOutput([
    countLine(chs.length),
    renderList("channels", chs, schema),
    renderHelp(["Run `slack-axi read <#channel|id>` to read a channel"]),
  ]);
}
