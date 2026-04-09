import { defineConfig } from "drizzle-kit";

function normalizeDatabaseUrl(databaseUrl: string) {
  try {
    const value = new URL(databaseUrl);
    const sslMode = value.searchParams.get("sslmode");
    const useLibpqCompat = value.searchParams.get("uselibpqcompat");

    if (
      sslMode &&
      ["prefer", "require", "verify-ca"].includes(sslMode) &&
      !useLibpqCompat
    ) {
      value.searchParams.set("sslmode", "verify-full");
    }

    return value.toString();
  } catch {
    return databaseUrl;
  }
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: normalizeDatabaseUrl(process.env.DATABASE_URL ?? "")
  }
});
