import { ghJson } from "../gh.js";
import { field, custom, renderList, renderHelp, renderOutput, countLine, oneLine } from "../toon.js";

const prSchema = [field("number"), custom("title", (p) => oneLine(p.title, 60)), custom("author", (p) => p.author?.login ?? "unknown")];
const issueSchema = [field("number"), custom("title", (i) => oneLine(i.title, 60)), custom("author", (i) => i.author?.login ?? "unknown")];

export async function homeCommand() {
  const [repo, prs, issues] = await Promise.all([
    ghJson(["repo", "view", "--json", "name,owner,defaultBranchRef"]),
    ghJson(["pr", "list", "--state", "open", "--limit", "5", "--json", "number,title,author"]),
    ghJson(["issue", "list", "--state", "open", "--limit", "5", "--json", "number,title,author"]),
  ]);
  return renderOutput([
    `repo: ${repo.owner?.login ?? "?"}/${repo.name ?? "?"} (${repo.defaultBranchRef?.name ?? "?"})`,
    `${countLine(prs.length)} open PRs (showing up to 5)`,
    prs.length ? renderList("prs", prs, prSchema) : "prs: none",
    `${countLine(issues.length)} open issues (showing up to 5)`,
    issues.length ? renderList("issues", issues, issueSchema) : "issues: none",
    renderHelp(["Run `pr list`/`issue list` to see more", "Run `pr view <n>`/`issue view <n>` for detail"]),
  ]);
}
