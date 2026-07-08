import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { slack, getToken } from "../client.js";
import { AxiError } from "../errors.js";
import { getPositional, getFlag } from "../args.js";
import { renderOutput, renderHelp } from "../toon.js";

export const FILE_HELP = `usage: slack-axi file <file_id> [flags]
Fetch a Slack file's content (get the id from a message's files[] list via
\`read\`/\`search\`/\`thread\`). Text files print inline; everything else (PDF,
images, docs, spreadsheets) downloads to disk and prints the local path —
open or read that path directly to view it.
flags:
  --out <path>   save to a specific path (default: a temp file with the original name)
  --limit <n>    max characters to print inline for text files (default 4000)
examples:
  slack-axi file F0BGPJLUU0Y
  slack-axi file F0BGPJLUU0Y --out ~/Downloads/report.pdf`;

const TEXT_TYPE = /^text\/|json|csv|xml/i;
const TEXT_LIMIT_DEFAULT = 4000;

export async function fileCommand(args) {
  const id = getPositional(args, 0);
  if (!id)
    throw new AxiError("Missing file_id", "VALIDATION_ERROR", [
      "Get a file id from `slack-axi read <channel>` or `search` output",
    ]);

  const { file } = await slack.get("files.info", { file: id });
  const url = file.url_private_download || file.url_private;
  if (!url)
    throw new AxiError("File has no downloadable content", "NOT_FOUND", [
      "It may be external, removed, or a Slack post/canvas rather than an uploaded file",
    ]);

  const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok)
    throw new AxiError(`Download failed: HTTP ${res.status}`, "API_ERROR", [
      res.status === 403 || res.status === 401
        ? "Check the token has files:read and can see this file"
        : "Retry, or check the file still exists in Slack",
    ]);
  const buf = Buffer.from(await res.arrayBuffer());

  const isText = TEXT_TYPE.test(file.mimetype || "") || TEXT_TYPE.test(file.filetype || "");
  const outFlag = getFlag(args, "--out");

  if (isText && !outFlag) {
    const limit = Number(getFlag(args, "--limit")) || TEXT_LIMIT_DEFAULT;
    const text = buf.toString("utf-8");
    const shown =
      text.length > limit
        ? `${text.slice(0, limit)}\n... [+${text.length - limit} chars, use --out to save the full file]`
        : text;
    return renderOutput([
      `file: ${file.name}`,
      `type: ${file.mimetype || file.filetype || "unknown"}`,
      `size: ${file.size ?? buf.length} bytes`,
      "content: |",
      shown.split("\n").map((l) => "  " + l).join("\n"),
    ]);
  }

  const outPath = outFlag || join(tmpdir(), file.name || `slack-file-${id}`);
  writeFileSync(outPath, buf);
  return renderOutput([
    `file: ${file.name}`,
    `type: ${file.mimetype || file.filetype || "unknown"}`,
    `size: ${buf.length} bytes`,
    `saved: ${outPath}`,
    renderHelp(["Open or read this path directly to view the file's content"]),
  ]);
}
