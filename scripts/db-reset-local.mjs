import { rm } from "fs/promises";
import { join } from "path";
import { cwd } from "process";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing");
}

function normalizeDatabaseUrl(value) {
  try {
    const url = new URL(value);
    const sslMode = url.searchParams.get("sslmode");
    const useLibpqCompat = url.searchParams.get("uselibpqcompat");

    if (
      sslMode &&
      ["prefer", "require", "verify-ca"].includes(sslMode) &&
      !useLibpqCompat
    ) {
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return value;
  }
}

const tables = [
  "document_context_chunks",
  "attachments",
  "generation_events",
  "generation_jobs",
  "document_versions",
  "documents",
  "session",
  "account",
  "verification",
  "user"
];

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

const pool = new Pool({
  connectionString: normalizeDatabaseUrl(databaseUrl)
});

try {
  for (const table of tables) {
    const { rowCount } = await pool.query(
      "select 1 from information_schema.tables where table_schema = 'public' and table_name = $1",
      [table]
    );

    if (!rowCount) {
      continue;
    }

    await pool.query(`drop table if exists ${quoteIdentifier(table)} cascade`);
  }

  await rm(join(cwd(), "uploads"), { recursive: true, force: true });
  await pool.query("drop schema if exists drizzle cascade");
} finally {
  await pool.end();
}
