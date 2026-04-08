import OpenAI from "openai";

export function getOpenAI(apiKey: string) {
  const normalizedKey = apiKey.trim();

  if (!normalizedKey) {
    throw new Error("Add your OpenAI key to continue.");
  }

  return new OpenAI({
    apiKey: normalizedKey,
  });
}
