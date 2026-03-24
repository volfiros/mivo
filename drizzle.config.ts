import { defineConfig } from "drizzle-kit";
import { normalizeDatabaseUrl } from "./lib/config";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: normalizeDatabaseUrl(process.env.DATABASE_URL ?? "")
  }
});
