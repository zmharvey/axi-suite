import { client } from "../client.js";
import { renderOutput, renderHelp } from "../toon.js";

/** Dashboard: who the configured token belongs to, plus next-step hints. */
export async function homeCommand() {
  const me = await client.get("/me");
  return renderOutput([
    `you: ${me.handle} <${me.email ?? "no email"}>`,
    `id: ${me.id}`,
    renderHelp([
      "Run `figma-axi teams <team_id> projects` to list projects in a team (Figma has no list-my-teams endpoint — get team_id from a team URL)",
      "Run `figma-axi projects <project_id> files` to list files in a project",
      "Run `figma-axi file <file_key>` for a file summary",
      "Run `figma-axi comments <file_key>` to read comments",
    ]),
  ]);
}
