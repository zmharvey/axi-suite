import { ghJson } from "../gh.js";
import { getPositional } from "../args.js";
import { field, custom, renderDetail, renderOutput } from "../toon.js";

export const REPO_HELP = `usage: github-axi repo [<owner/repo>]
Shows repo metadata — defaults to the repo in the current directory.
examples:
  github-axi repo
  github-axi repo zmharvey/axi-suite`;

const FIELDS = "name,owner,description,isPrivate,isArchived,isFork,defaultBranchRef,stargazerCount,forkCount,url,pushedAt";

const schema = [
  field("name"),
  custom("owner", (r) => r.owner?.login ?? "unknown"),
  field("description"),
  custom("private", (r) => (r.isPrivate ? "yes" : "no")),
  custom("archived", (r) => (r.isArchived ? "yes" : "no")),
  custom("fork", (r) => (r.isFork ? "yes" : "no")),
  custom("default_branch", (r) => r.defaultBranchRef?.name ?? "unknown"),
  field("stargazerCount", "stars"),
  field("forkCount", "forks"),
  field("pushedAt", "pushed_at"),
  field("url"),
];

export async function repoCommand(args) {
  const target = getPositional(args, 0);
  const res = await ghJson(target ? ["repo", "view", target, "--json", FIELDS] : ["repo", "view", "--json", FIELDS]);
  return renderOutput([renderDetail("repo", res, schema)]);
}
