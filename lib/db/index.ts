import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "@/lib/config";

let database: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;
let ensured = false;

export function getDb() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl });
    database = drizzle(pool);
  }

  return database!;
}

export async function ensureDatabase() {
  if (ensured) {
    return;
  }

  getDb();
  ensured = true;
}
