import { client } from "../client.js";
import { resolveProjectRef } from "../context.js";
import { getFlag } from "../args.js";
import { custom, renderList, renderHelp, renderOutput, countLine } from "../toon.js";

const schema = [
  custom("level", (l) => l.level ?? "?"),
  custom("name", (l) => l.name ?? l.title ?? "?"),
  custom("facing", (l) => (Array.isArray(l.categories) ? l.categories.join(",") : l.facing || "")),
  custom("detail", (l) => (l.description || l.detail || "").replace(/\s+/g, " ").slice(0, 90)),
];

export async function advisorsCommand(args, ctx) {
  const ref = await resolveProjectRef(ctx);
  const type = getFlag(args, "--type") || "security";
  const res = await client.get(`/projects/${ref}/advisors/${type}`);
  const lints = res.lints || (Array.isArray(res) ? res : []);
  return renderOutput([
    countLine(lints.length) + ` ${type} findings`,
    lints.length ? renderList("advisors", lints, schema) : "advisors: none",
    renderHelp([
      type === "security"
        ? "Run `supabase-axi advisors --type performance` for performance lints"
        : "Run `supabase-axi advisors --type security` for security lints",
    ]),
  ]);
}
