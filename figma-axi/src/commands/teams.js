import { client } from "../client.js";
import { getPositional } from "../args.js";
import { AxiError } from "../errors.js";
import { field, renderList, renderHelp, renderOutput, countLine } from "../toon.js";

export const TEAMS_HELP = `usage: figma-axi teams <team_id> projects
Lists the projects within a Figma team. Figma's REST API has no "list my
teams" endpoint — find a team_id from a team URL
(figma.com/files/team/<team_id>/...) or your Figma org admin.
examples:
  figma-axi teams 123456789012345678 projects`;

const projectSchema = [field("id"), field("name")];

export async function teamsCommand(args) {
  const teamId = getPositional(args, 0);
  const sub = args[1];
  if (!teamId || sub !== "projects")
    throw new AxiError("Usage: figma-axi teams <team_id> projects", "VALIDATION_ERROR", [
      "Figma has no list-my-teams endpoint — get team_id from a team URL",
    ]);
  const res = await client.get(`/teams/${teamId}/projects`);
  const projects = res.projects || [];
  return renderOutput([
    countLine(projects.length),
    renderList("projects", projects, projectSchema),
    renderHelp(["Run `figma-axi projects <project_id> files` to list files in a project"]),
  ]);
}
