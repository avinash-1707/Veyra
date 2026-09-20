import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const migrationsDirectory = path.join(process.cwd(), "infra", "migrations");
const entries = await readdir(migrationsDirectory);
const migrationFiles = entries.filter((entry) => /^\d{4}_.+\.sql$/u.test(entry)).sort();

if (migrationFiles.length === 0) {
  console.error("No SQL migrations found in infra/migrations.");
  process.exitCode = 1;
} else if (migrationFiles.join("\n") !== [...migrationFiles].sort().join("\n")) {
  console.error("Migration files must sort in apply order.");
  process.exitCode = 1;
}

for (const fileName of migrationFiles) {
  const sql = await readFile(path.join(migrationsDirectory, fileName), "utf8");
  if (!sql.trim().endsWith(";")) {
    console.error(`${fileName} must end with a SQL statement terminator.`);
    process.exitCode = 1;
  }
}
