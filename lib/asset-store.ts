import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ensureDatabase, getDb } from "@/lib/db";
import { storedAssets } from "@/lib/db/schema";

type StoredAssetKind = "upload" | "generated_image";

export async function createStoredAsset(params: {
  kind: StoredAssetKind;
  mimeType: string;
  filename?: string;
  buffer: Buffer;
}) {
  await ensureDatabase();
  const db = getDb();
  const id = nanoid();

  await db.insert(storedAssets).values({
    id,
    kind: params.kind,
    mimeType: params.mimeType,
    filename: params.filename ?? null,
    dataBase64: params.buffer.toString("base64"),
    createdAt: new Date()
  });

  return {
    id,
    storagePath: `db://asset/${id}`
  };
}

export async function getStoredAsset(assetId: string) {
  await ensureDatabase();
  const db = getDb();
  const [asset] = await db
    .select()
    .from(storedAssets)
    .where(eq(storedAssets.id, assetId))
    .limit(1);

  if (!asset) {
    return null;
  }

  return {
    ...asset,
    buffer: Buffer.from(asset.dataBase64, "base64")
  };
}

export function getStoredAssetIdFromPath(storagePath: string) {
  if (!storagePath.startsWith("db://asset/")) {
    return null;
  }

  const assetId = storagePath.slice("db://asset/".length).trim();
  return assetId || null;
}

export async function deleteStoredAssetById(assetId: string) {
  await ensureDatabase();
  const db = getDb();
  await db.delete(storedAssets).where(eq(storedAssets.id, assetId));
}
