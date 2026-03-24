import OpenAI from "openai";
import { config } from "@/lib/config";

let client: OpenAI | null = null;

export function getOpenAI() {
  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: config.openAiApiKey
    });
  }

  return client;
}
