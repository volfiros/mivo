import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL_DEFAULT: z.string().min(1).default("gpt-5-mini"),
  OPENAI_MODEL_COMPLEX: z.string().min(1).default("gpt-5.4"),
  OPENAI_EMBEDDING_MODEL: z.string().min(1).default("text-embedding-3-small"),
  DATABASE_URL: z.string().min(1).optional(),
  BETTER_AUTH_SECRET: z.string().min(1).optional(),
  BETTER_AUTH_URL: z.string().url().optional()
});

const parsed = envSchema.parse(process.env);

export function normalizeDatabaseUrl(databaseUrl: string) {
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

export const config = {
  openAiApiKey: parsed.OPENAI_API_KEY ?? "",
  defaultModel: parsed.OPENAI_MODEL_DEFAULT,
  complexModel: parsed.OPENAI_MODEL_COMPLEX,
  embeddingModel: parsed.OPENAI_EMBEDDING_MODEL,
  databaseUrl: parsed.DATABASE_URL
    ? normalizeDatabaseUrl(parsed.DATABASE_URL)
    : "",
  betterAuthSecret:
    parsed.BETTER_AUTH_SECRET ??
    "development-only-better-auth-secret-change-me-1234567890",
  betterAuthUrl: parsed.BETTER_AUTH_URL ?? "http://localhost:3000"
};

export function assertServerConfig() {
  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }
}
