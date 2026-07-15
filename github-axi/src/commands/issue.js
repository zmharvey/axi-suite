import { ghJson, ghRun } from "../gh.js";
import { getFlag, getPositional, hasFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { field, custom, renderList, renderDetail, renderHelp, renderOutput, countLine, oneLine } from "../toon.js";

export const ISSUE_HELP = `usage: github-axi issue <subcommand> [args] [flags]
subcommands[4]:
  list (default) [--state open|closed|all] [--limit n]
  view <number>
  create --title "..." --body "..." [--confirm]
  comment <number> --body "..." [--confirm]
examples:
  github-axi issue list
  github-axi issue view 12
  github-axi issue create --title "Bug: X" --body "..." --confirm
  github-axi issue comment 12 --body "Looking into this" --confirm`;

const listSchema = [
  field("number"),
  custom("title", (i) => oneLine(i.title, 70)),
  custom("author", (i) => i.author?.login ?? "unknown"),
  field("state"),
  field("createdAt", "created"),
];

async function issueList(args) {
  const state = getFlag(args, "--state") || "open";
  const limit = getFlag(args, "--limit") || "20";
  const res = await ghJson(["issue", "list", "--state", state, "--limit", limit, "--json", "number,title,author,state,createdAt"]);
  return renderOutput([
    countLine(res.length),
    res.length ? renderList("issues", res, listSchema) : "issues: none",
    renderHelp(["Run `issue view <number>` for full detail"]),
  ]);
}

const detailSchema = [
  field("number"),
  field("title"),
  custom("author", (i) => i.author?.login ?? "unknown"),
  field("state"),
  custom("comments", (i) => (Array.isArray(i.comments) ? i.comments.length : 0)),
  field("body"),
  field("url"),
];

async function issueView(args) {
  const number = getPositional(args, 0);
  if (!number) throw new AxiError("Usage: issue view <number>", "VALIDATION_ERROR");
  const res = await ghJson(["issue", "view", number, "--json", "number,title,author,state,comments,body,url"]);
  return renderOutput([renderDetail("issue", res, detailSchema)]);
}

async function issueCreate(args) {
  const title = getFlag(args, "--title");
  const body = getFlag(args, "--body") || "";
  if (!title) throw new AxiError('Usage: issue create --title "..." --body "..." [--confirm]', "VALIDATION_ERROR");
  if (!hasFlag(args, "--confirm")) {
    return renderOutput([
      "dry-run: would create this issue",
      `title: ${title}`,
      `body: ${body}`,
      renderHelp(["Re-run with --confirm to actually create it"]),
    ]);
  }
  const out = await ghRun(["issue", "create", "--title", title, "--body", body]);
  return renderOutput(["created: yes", out]);
}

async function issueComment(args) {
  const number = getPositional(args, 0);
  const body = getFlag(args, "--body");
  if (!number || !body) throw new AxiError('Usage: issue comment <number> --body "..." [--confirm]', "VALIDATION_ERROR");
  if (!hasFlag(args, "--confirm")) {
    return renderOutput([
      "dry-run: would post this comment",
      `issue: #${number}`,
      `body: ${body}`,
      renderHelp(["Re-run with --confirm to actually post it"]),
    ]);
  }
  await ghRun(["issue", "comment", number, "--body", body]);
  return renderOutput(["posted: yes", `issue: #${number}`]);
}

export async function issueCommand(args) {
  const sub = args[0];
  switch (sub) {
    case "list":
    case undefined:
      return issueList(args.slice(1));
    case "view":
      return issueView(args.slice(1));
    case "create":
      return issueCreate(args.slice(1));
    case "comment":
      return issueComment(args.slice(1));
    default:
      throw new AxiError(`Unknown issue subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Subcommands: list, view, create, comment",
      ]);
  }
}
