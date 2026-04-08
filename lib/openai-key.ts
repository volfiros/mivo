import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import OpenAI from "openai";
import { eq } from "drizzle-orm";
import { config } from "@/lib/config";
import { ensureDatabase, getDb } from "@/lib/db";
import { user } from "@/lib/db/schema";

const ENCRYPTION_VERSION = "v1";
const IV_LENGTH = 12;

function deriveEncryptionKey(secret: string) {
  return createHash("sha256").update(secret).digest();
}

function encodePart(value: Buffer) {
  return value.toString("base64url");
}

function decodePart(value: string) {
  return Buffer.from(value, "base64url");
}

function encryptOpenAiKey(apiKey: string) {
  const key = deriveEncryptionKey(config.userOpenAiKeyEncryptionSecret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(apiKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    encodePart(iv),
    encodePart(authTag),
    encodePart(ciphertext),
  ].join(":");
}

function decryptOpenAiKey(encryptedValue: string) {
  const [version, ivPart, authTagPart, ciphertextPart] = encryptedValue.split(":");

  if (
    version !== ENCRYPTION_VERSION ||
    !ivPart ||
    !authTagPart ||
    !ciphertextPart
  ) {
    throw new Error("Stored OpenAI key could not be decrypted.");
  }

  const key = deriveEncryptionKey(config.userOpenAiKeyEncryptionSecret);
  const decipher = createDecipheriv("aes-256-gcm", key, decodePart(ivPart));
  decipher.setAuthTag(decodePart(authTagPart));

  return Buffer.concat([
    decipher.update(decodePart(ciphertextPart)),
    decipher.final(),
  ]).toString("utf8");
}

function sanitizeOpenAiKey(apiKey: string) {
  return apiKey.trim();
}

export function maskOpenAiKey(lastFour: string | null | undefined) {
  if (!lastFour) {
    return null;
  }

  return `••••••••••••${lastFour}`;
}

export async function getUserOpenAiKeySummary(userId: string) {
  await ensureDatabase();
  const db = getDb();
  const [record] = await db
    .select({
      encryptedKey: user.openAiApiKeyEncrypted,
      lastFour: user.openAiApiKeyLastFour,
      updatedAt: user.openAiApiKeyUpdatedAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return {
    hasOpenAiKey: Boolean(record?.encryptedKey),
    maskedOpenAiKey: maskOpenAiKey(record?.lastFour),
    openAiKeyUpdatedAt: record?.updatedAt ?? null,
  };
}

export async function getUserOpenAiApiKey(userId: string) {
  await ensureDatabase();
  const db = getDb();
  const [record] = await db
    .select({
      encryptedKey: user.openAiApiKeyEncrypted,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!record?.encryptedKey) {
    return null;
  }

  return decryptOpenAiKey(record.encryptedKey);
}

export async function saveUserOpenAiApiKey(userId: string, apiKey: string) {
  const nextKey = sanitizeOpenAiKey(apiKey);

  if (!nextKey) {
    throw new Error("OpenAI key is required.");
  }

  await ensureDatabase();
  const db = getDb();
  const lastFour = nextKey.slice(-4);
  const updatedAt = new Date();

  await db
    .update(user)
    .set({
      openAiApiKeyEncrypted: encryptOpenAiKey(nextKey),
      openAiApiKeyLastFour: lastFour,
      openAiApiKeyUpdatedAt: updatedAt,
      updatedAt,
    })
    .where(eq(user.id, userId));

  return {
    hasOpenAiKey: true,
    maskedOpenAiKey: maskOpenAiKey(lastFour),
    openAiKeyUpdatedAt: updatedAt,
  };
}

export async function deleteUserOpenAiApiKey(userId: string) {
  await ensureDatabase();
  const db = getDb();
  const updatedAt = new Date();

  await db
    .update(user)
    .set({
      openAiApiKeyEncrypted: null,
      openAiApiKeyLastFour: null,
      openAiApiKeyUpdatedAt: null,
      updatedAt,
    })
    .where(eq(user.id, userId));

  return {
    hasOpenAiKey: false,
    maskedOpenAiKey: null,
    openAiKeyUpdatedAt: null,
  };
}

export async function validateOpenAiApiKey(apiKey: string) {
  const normalizedKey = sanitizeOpenAiKey(apiKey);

  if (!normalizedKey) {
    throw new Error("OpenAI key is required.");
  }

  const client = new OpenAI({ apiKey: normalizedKey });

  try {
    await client.responses.create({
      model: config.defaultModel,
      input: "ping",
      max_output_tokens: 1,
    });
    await client.embeddings.create({
      model: config.embeddingModel,
      input: "ping",
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Unable to verify the OpenAI key.";

    throw new Error(
      `Unable to verify this OpenAI key. ${message}`,
    );
  }
}
