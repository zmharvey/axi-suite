import { ghJson, ghText, ghRun } from "../gh.js";
import { getFlag, getPositional, hasFlag } from "../args.js";
import { AxiError } from "../errors.js";
import { field, custom, renderList, renderDetail, renderHelp, renderOutput, countLine, oneLine } from "../toon.js";

export const PR_HELP = `usage: github-axi pr <subcommand> [args] [flags]
subcommands[4]:
  list (default) [--state open|closed|merged|all] [--limit n]
  view <number>
  checks <number>
  create --title "..." --body "..." [--base <branch>] [--confirm]
examples:
  github-axi pr list
  github-axi pr list --state all --limit 50
  github-axi pr view 7
  github-axi pr checks 7
  github-axi pr create --title "Fix bug" --body "..." --confirm`;

const listSchema = [
  field("number"),
  custom("title", (p) => oneLine(p.title, 70)),
  custom("author", (p) => p.author?.login ?? "unknown"),
  custom("draft", (p) => (p.isDraft ? "yes" : "no")),
  field("createdAt", "created"),
];

async function prList(args) {
  const state = getFlag(args, "--state") || "open";
  const limit = getFlag(args, "--limit") || "20";
  const res = await ghJson(["pr", "list", "--state", state, "--limit", limit, "--json", "number,title,author,isDraft,createdAt"]);
  return renderOutput([
    countLine(res.length),
    res.length ? renderList("prs", res, listSchema) : "prs: none",
    renderHelp(["Run `pr view <number>` for full detail"]),
  ]);
}

const detailSchema = [
  field("number"),
  field("title"),
  custom("author", (p) => p.author?.login ?? "unknown"),
  custom("state", (p) => (p.closed ? (p.mergedAt ? "merged" : "closed") : "open")),
  custom("draft", (p) => (p.isDraft ? "yes" : "no")),
  field("baseRefName", "base"),
  field("headRefName", "head"),
  custom("mergeable", (p) => p.mergeable ?? "unknown"),
  custom("changed_files", (p) => p.changedFiles ?? 0),
  custom("additions", (p) => p.additions ?? 0),
  custom("deletions", (p) => p.deletions ?? 0),
  field("body"),
  field("url"),
];

async function prView(args) {
  const number = getPositional(args, 0);
  if (!number) throw new AxiError("Usage: pr view <number>", "VALIDATION_ERROR");
  const res = await ghJson([
    "pr",
    "view",
    number,
    "--json",
    "number,title,author,closed,mergedAt,isDraft,baseRefName,headRefName,mergeable,changedFiles,additions,deletions,body,url",
  ]);
  return renderOutput([renderDetail("pr", res, detailSchema)]);
}

async function prChecks(args) {
  const number = getPositional(args, 0);
  if (!number) throw new AxiError("Usage: pr checks <number>", "VALIDATION_ERROR");
  const out = await ghText(["pr", "checks", number]);
  return renderOutput([out.trim() || "no checks reported"]);
}

async function prCreate(args) {
  const title = getFlag(args, "--title");
  const body = getFlag(args, "--body") || "";
  const base = getFlag(args, "--base");
  if (!title)
    throw new AxiError('Usage: pr create --title "..." --body "..." [--base <branch>] [--confirm]', "VALIDATION_ERROR");
  if (!hasFlag(args, "--confirm")) {
    return renderOutput([
      "dry-run: would create this PR",
      `title: ${title}`,
      `body: ${body}`,
      ...(base ? [`base: ${base}`] : []),
      renderHelp(["Re-run with --confirm to actually create it"]),
    ]);
  }
  const ghArgs = ["pr", "create", "--title", title, "--body", body];
  if (base) ghArgs.push("--base", base);
  const out = await ghRun(ghArgs);
  return renderOutput(["created: yes", out]);
}

export async function prCommand(args) {
  const sub = args[0];
  switch (sub) {
    case "list":
    case undefined:
      return prList(args.slice(1));
    case "view":
      return prView(args.slice(1));
    case "checks":
      return prChecks(args.slice(1));
    case "create":
      return prCreate(args.slice(1));
    default:
      throw new AxiError(`Unknown pr subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Subcommands: list, view, checks, create",
      ]);
  }
}
