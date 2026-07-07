import { AxiError } from "./errors.js";
import { client, configProjectRef } from "./client.js";

/** Strip -p/--project from args and return the flag value + cleaned args. */
export function parseProjectContext(args) {
  const stripped = [];
  let projectFlag;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === "-p" || a === "--project") && i + 1 < args.length) {
      projectFlag = args[i + 1];
      i++;
      continue;
    }
    if (a.startsWith("-p=")) { projectFlag = a.slice(3); continue; }
    if (a.startsWith("--project=")) { projectFlag = a.slice("--project=".length); continue; }
    stripped.push(a);
  }
  return { projectFlag, strippedArgs: stripped };
}

let projectsCache;
export async function listProjects() {
  if (!projectsCache) projectsCache = await client.get("/projects");
  return projectsCache || [];
}

/** Resolve a project ref: flag > env/config > sole project. */
export async function resolveProjectRef(ctx) {
  if (ctx?.projectFlag) return ctx.projectFlag;
  const cfg = configProjectRef();
  if (cfg) return cfg;
  const projects = await listProjects();
  if (projects.length === 1) return projects[0].id;
  if (projects.length === 0) throw new AxiError("No projects found for this token", "NOT_FOUND");
  throw new AxiError(
    "Multiple projects — pick one with --project <ref>",
    "VALIDATION_ERROR",
    projects.map((p) => `--project ${p.id}  (${p.name})`),
  );
}
