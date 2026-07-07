import { listProjects } from "../context.js";
import { field, custom, renderList, renderHelp, renderOutput, countLine } from "../toon.js";

const schema = [
  field("id", "ref"),
  field("name"),
  field("region"),
  custom("status", (p) => p.status ?? "?"),
  custom("pg", (p) => (p.database?.version ? "v" + String(p.database.version).split(".")[0] : "?")),
];

async function renderProjects() {
  const projects = await listProjects();
  return renderOutput([
    countLine(projects.length) + " projects",
    renderList("projects", projects, schema),
    renderHelp([
      "Run `supabase-axi tables` to list tables in a project",
      'Run `supabase-axi db query "select ..."` to run SQL',
      "Run `supabase-axi functions` / `advisors` for edge functions / lints",
      "Target a project with -p <ref> (or set SUPABASE_PROJECT_REF)",
    ]),
  ]);
}

export function homeCommand() {
  return renderProjects();
}
export function projectsCommand() {
  return renderProjects();
}
