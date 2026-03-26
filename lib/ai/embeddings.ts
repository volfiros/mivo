import { config } from "@/lib/config";
import { getOpenAI } from "@/lib/ai/client";

const EMBEDDING_BATCH_SIZE = 32;

export async function embedTexts(values: string[]) {
  const normalizedValues = values.map((value) => value.trim());

  if (!normalizedValues.length || normalizedValues.every((value) => !value)) {
    return [];
  }

  const client = getOpenAI();
  const embeddings: number[][] = [];

  for (let index = 0; index < normalizedValues.length; index += EMBEDDING_BATCH_SIZE) {
    const batch = normalizedValues.slice(index, index + EMBEDDING_BATCH_SIZE);
    const response = await client.embeddings.create({
      model: config.embeddingModel,
      input: batch,
    });

    embeddings.push(...response.data.map((item) => item.embedding));
  }

  return embeddings;
}

export async function embedSingleText(value: string) {
  const [embedding] = await embedTexts([value]);
  return embedding ?? null;
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (!left.length || left.length !== right.length) {
    return Number.NEGATIVE_INFINITY;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return Number.NEGATIVE_INFINITY;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}
