import { readFile, rm } from "fs/promises";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import {
  createStoredAsset,
  deleteStoredAssetById,
  getStoredAsset,
  getStoredAssetIdFromPath,
} from "@/lib/asset-store";

export async function saveUpload(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const storedAsset = await createStoredAsset({
    kind: "upload",
    mimeType: file.type || "application/octet-stream",
    filename: file.name,
    buffer
  });

  const extractedText = await extractText(file.type, buffer);

  return {
    id: storedAsset.id,
    storagePath: storedAsset.storagePath,
    extractedText
  };
}

async function extractText(mimeType: string, buffer: Buffer) {
  if (mimeType === "text/plain") {
    return buffer.toString("utf8");
  }

  if (mimeType === "application/pdf") {
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  return buffer.toString("utf8");
}

export function chunkText(text: string, chunkSize = 1200) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];

  for (let index = 0; index < normalized.length; index += chunkSize) {
    chunks.push(normalized.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function readStoredFile(pathname: string) {
  const storedAssetId = getStoredAssetIdFromPath(pathname);

  if (storedAssetId) {
    const asset = await getStoredAsset(storedAssetId);

    if (!asset) {
      throw new Error("Stored asset not found");
    }

    return asset.buffer;
  }

  return readFile(pathname);
}

export async function deleteStoredFile(pathname: string) {
  const storedAssetId = getStoredAssetIdFromPath(pathname);

  if (storedAssetId) {
    await deleteStoredAssetById(storedAssetId);
    return;
  }

  await rm(pathname, { force: true });
}

export async function saveGeneratedImage(
  buffer: Buffer,
  format: "png" | "jpeg" | "webp" = "webp",
) {
  const filename = `generated.${format === "jpeg" ? "jpg" : format}`;
  const storedAsset = await createStoredAsset({
    kind: "generated_image",
    mimeType: format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : "image/webp",
    filename,
    buffer,
  });

  return {
    filename,
    publicPath: `/api/assets/${storedAsset.id}`,
    storagePath: storedAsset.storagePath,
  };
}
