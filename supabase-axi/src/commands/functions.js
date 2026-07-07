import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { client, getToken } from "../client.js";
import { mapSupabaseError, AxiError } from "../errors.js";
import { resolveProjectRef } from "../context.js";
import { getFlag, hasFlag, getPositional } from "../args.js";
import { field, custom, renderList, renderHelp, renderOutput, countLine } from "../toon.js";

export const FUNCTIONS_HELP = `usage: supabase-axi functions [list] | functions deploy <slug> --file <path> [flags]
subcommands[2]:
  list (default)                 list edge functions
  deploy <slug> --file <path>    deploy a single-file function. DRAFT-FIRST:
                                 prints what would be sent; add --confirm to push.
flags{deploy}:
  --file <path> (required, e.g. ./index.ts), --verify-jwt, --confirm
examples:
  supabase-axi functions
  supabase-axi functions deploy send-email --file ./index.ts --confirm`;

const schema = [
  field("slug"),
  field("name"),
  custom("status", (f) => f.status ?? "?"),
  field("version"),
  custom("verify_jwt", (f) => (f.verify_jwt ? "yes" : "no")),
];

async function functionsList(ctx) {
  const ref = await resolveProjectRef(ctx);
  const res = await client.get(`/projects/${ref}/functions`);
  const list = Array.isArray(res) ? res : res.functions || [];
  return renderOutput([
    countLine(list.length) + " edge functions",
    list.length ? renderList("functions", list, schema) : "functions: none",
    renderHelp([
      "Use -p <ref> to target a different project",
      "Run `supabase-axi functions deploy <slug> --file <path>` to deploy",
    ]),
  ]);
}

async function functionsDeploy(args, ctx) {
  const slug = getPositional(args, 0);
  const filePath = getFlag(args, "--file");
  const confirm = hasFlag(args, "--confirm");
  const verifyJwt = hasFlag(args, "--verify-jwt");
  if (!slug || !filePath)
    throw new AxiError("functions deploy needs <slug> and --file <path>", "VALIDATION_ERROR", [
      "Usage: supabase-axi functions deploy <slug> --file ./index.ts",
    ]);
  if (!existsSync(filePath)) throw new AxiError(`File not found: ${filePath}`, "VALIDATION_ERROR");
  const source = readFileSync(filePath, "utf-8");
  const entrypoint = basename(filePath);

  if (!confirm) {
    return renderOutput([
      "dry_run: yes",
      `would_deploy: ${slug}`,
      `entrypoint: ${entrypoint}`,
      `bytes: ${source.length}`,
      `verify_jwt: ${verifyJwt ? "yes" : "no"}`,
      renderHelp([
        "This pushes to your live project (multi-file functions with import maps aren't supported yet — single file only)",
        "Add --confirm to actually deploy",
      ]),
    ]);
  }

  const ref = await resolveProjectRef(ctx);
  const metadata = { name: slug, entrypoint_path: entrypoint, verify_jwt: verifyJwt };
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  form.append("file", new Blob([source], { type: "text/typescript" }), entrypoint);

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/functions/deploy?slug=${encodeURIComponent(slug)}`,
    { method: "POST", headers: { Authorization: `Bearer ${getToken()}` }, body: form },
  );
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw mapSupabaseError(res.status, json);
  return renderOutput([
    "deployed: yes",
    `slug: ${json.slug ?? slug}`,
    `version: ${json.version ?? "?"}`,
    `status: ${json.status ?? "?"}`,
  ]);
}

export async function functionsCommand(args, ctx) {
  const sub = args[0];
  const rest = args.slice(1);
  switch (sub) {
    case "list":
    case undefined:
      return functionsList(ctx);
    case "deploy":
      return functionsDeploy(rest, ctx);
    default:
      throw new AxiError(`Unknown functions subcommand: ${sub}`, "VALIDATION_ERROR", [
        "Subcommands: list, deploy <slug> --file <path>",
      ]);
  }
}
