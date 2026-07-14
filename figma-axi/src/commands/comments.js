import { client } from "../client.js";
import { getFlag, getPositional, hasFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { field, custom, renderList, renderHelp, renderOutput, countLine } from "../toon.js";

export const COMMENTS_HELP = `usage: figma-axi comments <file_key>
Lists comments on a file (id, user handle, message, created_at, resolved).
examples:
  figma-axi comments abc123XYZ`;

export const COMMENT_HELP = `usage: figma-axi comment <file_key> --text "..." [--node-id <id>] [--confirm]
Posts a comment on a file. Draft-first: without --confirm it only shows what
would be posted. Add --confirm to actually post.
flags:
  --text <text> (required)   the comment body
  --node-id <id>              pin the comment to a specific node
  --confirm                   actually post (otherwise dry-run only)
examples:
  figma-axi comment abc123XYZ --text "Looks good"                       # dry-run
  figma-axi comment abc123XYZ --text "Fix this" --node-id 1:23 --confirm`;

const commentSchema = [
  field("id"),
  custom("by", (c) => c.user?.handle ?? "unknown"),
  custom("message", (c) => (c.message || "").replace(/\n/g, " ").slice(0, 200)),
  field("created_at"),
  custom("resolved", (c) => (c.resolved_at ? "yes" : "no")),
];

export async function commentsCommand(args) {
  const fileKey = getPositional(args, 0);
  if (!fileKey) throw new AxiError("Missing file_key", "VALIDATION_ERROR");
  const res = await client.get(`/files/${fileKey}/comments`);
  const comments = res.comments || [];
  return renderOutput([
    countLine(comments.length),
    renderList("comments", comments, commentSchema),
    renderHelp([`Run \`figma-axi comment ${fileKey} --text "..."\` to add one`]),
  ]);
}

export async function commentCommand(args) {
  const fileKey = getPositional(args, 0);
  const text = getFlag(args, "--text");
  const nodeId = getFlag(args, "--node-id");
  if (!fileKey || !text)
    throw new AxiError(
      'Usage: figma-axi comment <file_key> --text "..." [--node-id <id>] [--confirm]',
      "VALIDATION_ERROR",
    );

  // Write guard: never post without an explicit --confirm.
  if (!hasFlag(args, "--confirm")) {
    return renderOutput([
      "dry-run: would post",
      `file: ${fileKey}`,
      `text: ${text}`,
      `node: ${nodeId ?? "(file-level, no pin)"}`,
      renderHelp(["Re-run with --confirm to actually post"]),
    ]);
  }

  const body = { message: text };
  // Figma's full FrameOffset client_meta also wants a node_offset {x,y}; we
  // only expose node_id (matches the CLI's node-lookup surface, no coordinate
  // picking), so a pinned comment may 400 if Figma requires the offset too —
  // omit --node-id to post an unpinned file-level comment if that happens.
  if (nodeId) body.client_meta = { node_id: nodeId };
  const res = await client.post(`/files/${fileKey}/comments`, body);
  return renderOutput([
    "posted: yes",
    `id: ${res.id ?? "unknown"}`,
    renderHelp([`Run \`figma-axi comments ${fileKey}\` to see it`]),
  ]);
}
