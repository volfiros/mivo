import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL_DEFAULT: z.string().min(1).default("gpt-5-mini"),
  OPENAI_MODEL_COMPLEX: z.string().min(1).default("gpt-5.4"),
  OPENAI_EMBEDDING_MODEL: z.string().min(1).default("text-embedding-3-small"),
  DATABASE_URL: z.string().min(1).optional()
});

const parsed = envSchema.parse(process.env);

export const config = {
  openAiApiKey: parsed.OPENAI_API_KEY ?? "",
  defaultModel: parsed.OPENAI_MODEL_DEFAULT,
  complexModel: parsed.OPENAI_MODEL_COMPLEX,
  embeddingModel: parsed.OPENAI_EMBEDDING_MODEL,
  databaseUrl: parsed.DATABASE_URL ?? ""
};

export function assertServerConfig() {
  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }
}
