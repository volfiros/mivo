import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";
import { normalizeDatabaseUrl } from "./lib/config";

if (existsSync(".env")) {
  process.loadEnvFile?.(".env");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: normalizeDatabaseUrl(process.env.DATABASE_URL ?? "")
  }
});
