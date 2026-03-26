import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { cwd } from "process";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { nanoid } from "nanoid";

const uploadDir = join(cwd(), "uploads");
const generatedImageDir = join(cwd(), "public", "generated");

export async function saveUpload(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const id = nanoid();
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const storagePath = join(uploadDir, `${id}.${extension}`);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(storagePath, buffer);

  const extractedText = await extractText(file.type, buffer);

  return {
    id,
    storagePath,
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
  return readFile(pathname);
}

export async function deleteStoredFile(pathname: string) {
  await rm(pathname, { force: true });
}

export async function saveGeneratedImage(
  buffer: Buffer,
  format: "png" | "jpeg" | "webp" = "webp",
) {
  const id = nanoid();
  const filename = `${id}.${format === "jpeg" ? "jpg" : format}`;
  const storagePath = join(generatedImageDir, filename);

  await mkdir(generatedImageDir, { recursive: true });
  await writeFile(storagePath, buffer);

  return {
    filename,
    publicPath: `/generated/${filename}`,
    storagePath,
  };
}
