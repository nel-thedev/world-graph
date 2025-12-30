import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWrite } from "../neo4j.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const cypherPath = path.resolve(__dirname, "../cypher/constraints.cypher");
  const cypher = await fs.readFile(cypherPath, "utf8");
  // Neo4j supports multiple statements separated by semicolons in browser,
  // but via driver it's safer to split and run.
  const statements = cypher
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await runWrite(stmt);
    console.log("Applied:", stmt.slice(0, 60) + (stmt.length > 60 ? "..." : ""));
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
