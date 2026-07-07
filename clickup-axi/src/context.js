import { AxiError } from "./errors.js";
import { client, configWorkspaceId } from "./client.js";

/**
 * Strip -W/--workspace from args (mirrors gh-axi's -R handling) and return the
 * flag value plus the cleaned args. Resolution to an actual id is lazy so that
 * commands not needing a workspace never trigger a network call.
 */
export function parseWorkspaceContext(args) {
  const stripped = [];
  let workspaceFlag;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === "-W" || a === "--workspace") && i + 1 < args.length) {
      workspaceFlag = args[i + 1];
      i++;
      continue;
    }
    if (a.startsWith("-W=")) {
      workspaceFlag = a.slice(3);
      continue;
    }
    if (a.startsWith("--workspace=")) {
      workspaceFlag = a.slice("--workspace=".length);
      continue;
    }
    stripped.push(a);
  }
  return { workspaceFlag, strippedArgs: stripped };
}

let teamsCache;
export async function listTeams() {
  if (!teamsCache) teamsCache = (await client.get("/team")).teams || [];
  return teamsCache;
}

/** Resolve a workspace (team) id: flag > env/config > sole team. */
export async function resolveWorkspaceId(ctx) {
  if (ctx?.workspaceFlag) return ctx.workspaceFlag;
  const cfg = configWorkspaceId();
  if (cfg) return cfg;
  const teams = await listTeams();
  if (teams.length === 1) return teams[0].id;
  if (teams.length === 0)
    throw new AxiError("No workspaces found for this token", "NOT_FOUND");
  throw new AxiError(
    "Multiple workspaces — pick one with --workspace <id>",
    "VALIDATION_ERROR",
    teams.map((t) => `--workspace ${t.id}  (${t.name})`),
  );
}

let meCache;
export async function resolveMe() {
  if (!meCache) meCache = (await client.get("/user")).user;
  return meCache;
}
