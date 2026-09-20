import { neon } from "@neondatabase/serverless";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl.trim() === "") {
  throw new Error("DATABASE_URL is required to apply migrations.");
}

const sql = neon(databaseUrl);
const migrationsDir = resolve(process.cwd(), "../../infra/migrations");
const files = (await readdir(migrationsDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort();

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

const appliedRows = await sql`SELECT filename FROM schema_migrations`;
const applied = new Set(appliedRows.map((row) => String(row.filename)));

for (const file of files) {
  if (applied.has(file)) continue;
  const migration = await readFile(join(migrationsDir, file), "utf8");
  for (const statement of splitSqlStatements(migration)) {
    await sql.query(statement, []);
  }
  await sql`INSERT INTO schema_migrations (filename) VALUES (${file})`;
  console.log(`Applied ${file}`);
}

console.log("Migrations are up to date.");

function splitSqlStatements(input) {
  const statements = [];
  let current = "";
  let inSingleQuote = false;
  let inDollarQuote = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (!inSingleQuote && char === "$" && next === "$") {
      inDollarQuote = !inDollarQuote;
      current += "$$";
      index += 1;
      continue;
    }
    if (!inDollarQuote && char === "'" && input[index - 1] !== "\\") {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }
    if (!inSingleQuote && !inDollarQuote && char === ";") {
      const statement = current.trim();
      if (statement.length > 0 && statement !== "BEGIN" && statement !== "COMMIT") statements.push(statement);
      current = "";
      continue;
    }
    current += char;
  }

  const finalStatement = current.trim();
  if (finalStatement.length > 0 && finalStatement !== "BEGIN" && finalStatement !== "COMMIT")
    statements.push(finalStatement);
  return statements;
}
