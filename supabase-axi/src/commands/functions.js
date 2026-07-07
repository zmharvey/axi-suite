import { client } from "../client.js";
import { resolveProjectRef } from "../context.js";
import { field, custom, renderList, renderHelp, renderOutput, countLine } from "../toon.js";

const schema = [
  field("slug"),
  field("name"),
  custom("status", (f) => f.status ?? "?"),
  field("version"),
  custom("verify_jwt", (f) => (f.verify_jwt ? "yes" : "no")),
];

export async function functionsCommand(args, ctx) {
  const ref = await resolveProjectRef(ctx);
  const res = await client.get(`/projects/${ref}/functions`);
  const list = Array.isArray(res) ? res : res.functions || [];
  return renderOutput([
    countLine(list.length) + " edge functions",
    list.length ? renderList("functions", list, schema) : "functions: none",
    renderHelp(["Use -p <ref> to target a different project"]),
  ]);
}
