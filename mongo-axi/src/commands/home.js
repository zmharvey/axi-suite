import { withClient, getUri, maskUri, configDefaultDb } from "../client.js";
import { renderOutput, renderHelp, renderList, field } from "../toon.js";

const dbSchema = [field("name"), field("sizeOnDisk"), field("empty")];

export async function homeCommand() {
  const uri = getUri(); // throws a clean AxiError (AUTH) if nothing is configured
  const defaultDb = configDefaultDb();
  const blocks = [
    `uri: ${maskUri(uri)}`,
    `defaultDb: ${defaultDb || "(none — pass --db on every command)"}`,
  ];

  let dbs = null;
  try {
    dbs = await withClient(async (client) => {
      const res = await client.db().admin().listDatabases();
      return res.databases || [];
    });
  } catch (err) {
    // Reachability is advisory on the dashboard — report it, don't crash the
    // whole dashboard just because the server is unreachable right now.
    blocks.push(`reachable: no (${err.message})`);
  }

  if (dbs) {
    blocks.push("reachable: yes");
    blocks.push(renderList("databases", dbs, dbSchema));
  }

  blocks.push(
    renderHelp([
      "Run `mongo-axi db list` to see databases",
      "Run `mongo-axi collections list --db <name>` to see collections in one",
      "Run `mongo-axi find <collection> --db <name>` to read documents",
    ]),
  );
  return renderOutput(blocks);
}
