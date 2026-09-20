import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { parseAppEnvironment } from "@veyra/config";

export type SqlClient = NeonQueryFunction<false, false>;

let cachedSql: SqlClient | undefined;

export function getRuntimeDatabaseUrl(input: NodeJS.ProcessEnv = process.env): string | undefined {
  const environment = parseAppEnvironment(input);
  if (environment.NODE_ENV === "production") return environment.DATABASE_URL_POOLED ?? environment.DATABASE_URL;
  return environment.DATABASE_URL ?? environment.DATABASE_URL_POOLED;
}

export function getMigrationDatabaseUrl(input: NodeJS.ProcessEnv = process.env): string | undefined {
  const environment = parseAppEnvironment(input);
  return environment.DATABASE_URL;
}

export function getSqlClient(): SqlClient | undefined {
  if (cachedSql !== undefined) return cachedSql;
  const databaseUrl = getRuntimeDatabaseUrl();
  if (databaseUrl === undefined) return undefined;
  cachedSql = neon(databaseUrl);
  return cachedSql;
}

export function resetSqlClientForTests(): void {
  cachedSql = undefined;
}
