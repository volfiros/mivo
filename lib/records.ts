import { and, asc, desc, eq, max, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { JSONContent } from "@tiptap/core";
import { ensureDatabase, getDb } from "@/lib/db";
import {
  attachments,
  documents,
  documentContextChunks,
  documentVersions,
  generationEvents,
  generationJobs
} from "@/lib/db/schema";
import { createEmptyDocument } from "@/lib/schema/editor";
import { createVersionRecord, type StoredVersion } from "@/lib/versioning";

export async function createDocument(params: { contentType: string; title: string }) {
  await ensureDatabase();
  const db = getDb();
  const id = nanoid();
  const initialContent = createEmptyDocument();
  const createdAt = new Date();

  await db.insert(documents).values({
    id,
    contentType: params.contentType,
    title: params.title,
    status: "draft",
    currentContentJson: initialContent,
    currentVersionId: null,
    createdAt,
    updatedAt: createdAt
  });

  const versionId = nanoid();

  await db.insert(documentVersions).values({
    id: versionId,
    documentId: id,
    versionNumber: 1,
    checkpointVersionNumber: 1,
    storageMode: "snapshot",
    baseVersionId: null,
    fullSnapshotJson: initialContent,
    jsonPatch: null,
    changeSource: "system_init",
    promptSnapshot: null,
    modelSnapshot: null,
    createdAt
  });

  await db
    .update(documents)
    .set({
      currentVersionId: versionId,
      updatedAt: new Date()
    })
    .where(eq(documents.id, id));

  return getDocument(id);
}

export async function getDocument(id: string) {
  await ensureDatabase();
  const db = getDb();
  const [document] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);

  if (!document) {
    return null;
  }

  const versions = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, id))
    .orderBy(desc(documentVersions.versionNumber));

  const uploads = await db.select().from(attachments).where(eq(attachments.documentId, id)).orderBy(desc(attachments.createdAt));

  return {
    ...document,
    currentContentJson: document.currentContentJson as JSONContent,
    versions,
    attachments: uploads
  };
}

export async function listRecentDocuments() {
  await ensureDatabase();
  const db = getDb();
  return db.select().from(documents).orderBy(desc(documents.updatedAt)).limit(12);
}

export async function saveDocumentContent(params: {
  documentId: string;
  content: JSONContent;
  title?: string;
  changeSource: string;
  promptSnapshot?: unknown;
  modelSnapshot?: unknown;
}) {
  await ensureDatabase();
  const db = getDb();
  const current = await getDocument(params.documentId);

  if (!current) {
    throw new Error("Document not found");
  }

  const latestVersion = current.versions[0];
  const baseVersion = await findCheckpointBase(params.documentId, latestVersion.versionNumber);
  const nextVersion = createVersionRecord({
    checkpointBaseVersion: baseVersion,
    currentVersionNumber: latestVersion.versionNumber,
    nextDocument: params.content
  });
  const versionId = nanoid();

  await db.insert(documentVersions).values({
    id: versionId,
    documentId: params.documentId,
    versionNumber: nextVersion.versionNumber,
    checkpointVersionNumber: nextVersion.checkpointVersionNumber,
    storageMode: nextVersion.storageMode,
    baseVersionId: nextVersion.baseVersionId,
    fullSnapshotJson: nextVersion.fullSnapshotJson,
    jsonPatch: nextVersion.jsonPatch,
    changeSource: params.changeSource,
    promptSnapshot: params.promptSnapshot ?? null,
    modelSnapshot: params.modelSnapshot ?? null,
    createdAt: new Date()
  });

  await db
    .update(documents)
    .set({
      title: params.title ?? current.title,
      currentContentJson: params.content,
      currentVersionId: versionId,
      updatedAt: new Date()
    })
    .where(eq(documents.id, params.documentId));

  return versionId;
}

async function findCheckpointBase(documentId: string, currentVersionNumber: number): Promise<StoredVersion | null> {
  await ensureDatabase();
  const db = getDb();

  const checkpointNumber = Math.floor(currentVersionNumber / 10) * 10 || 1;
  const [version] = await db
    .select()
    .from(documentVersions)
    .where(and(eq(documentVersions.documentId, documentId), eq(documentVersions.versionNumber, checkpointNumber)))
    .limit(1);

  if (!version) {
    const [first] = await db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.documentId, documentId), eq(documentVersions.versionNumber, 1)))
      .limit(1);

    return first
      ? {
          ...first,
          storageMode: first.storageMode as StoredVersion["storageMode"],
          fullSnapshotJson: first.fullSnapshotJson as JSONContent | null,
          jsonPatch: (first.jsonPatch as unknown[]) ?? null
        }
      : null;
  }

  return {
    ...version,
    storageMode: version.storageMode as StoredVersion["storageMode"],
    fullSnapshotJson: version.fullSnapshotJson as JSONContent | null,
    jsonPatch: (version.jsonPatch as unknown[]) ?? null
  };
}

export async function createGenerationJob(params: { documentId: string; mode: string; requestPayload: unknown }) {
  await ensureDatabase();
  const db = getDb();
  const id = nanoid();
  await db.insert(generationJobs).values({
    id,
    documentId: params.documentId,
    targetVersionId: null,
    mode: params.mode,
    status: "queued",
    requestPayload: params.requestPayload,
    progress: 0,
    error: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date()
  });
  return id;
}

export async function getGenerationJob(jobId: string) {
  await ensureDatabase();
  const db = getDb();
  const [job] = await db.select().from(generationJobs).where(eq(generationJobs.id, jobId)).limit(1);
  return job ?? null;
}

export async function setJobStatus(jobId: string, status: string, progress = 0, error?: string | null) {
  await ensureDatabase();
  const db = getDb();
  await db
    .update(generationJobs)
    .set({
      status,
      progress,
      error: error ?? null,
      startedAt: status === "running" ? new Date() : undefined,
      completedAt: ["completed", "failed", "cancelled"].includes(status) ? new Date() : undefined
    })
    .where(eq(generationJobs.id, jobId));
}

export async function appendGenerationEvent(jobId: string, eventType: string, payload: unknown) {
  await ensureDatabase();
  const db = getDb();
  const [result] = await db
    .select({ value: max(generationEvents.sequence) })
    .from(generationEvents)
    .where(eq(generationEvents.jobId, jobId));
  const sequence = (result?.value ?? 0) + 1;
  await db.insert(generationEvents).values({
    id: nanoid(),
    jobId,
    sequence,
    eventType,
    payload,
    createdAt: new Date()
  });
  return sequence;
}

export async function getGenerationEvents(jobId: string) {
  await ensureDatabase();
  const db = getDb();
  return db.select().from(generationEvents).where(eq(generationEvents.jobId, jobId)).orderBy(asc(generationEvents.sequence));
}

export async function createAttachmentRecord(params: {
  documentId: string;
  filename: string;
  mimeType: string;
  storagePath: string;
  extractedText: string;
  chunks: string[];
}) {
  await ensureDatabase();
  const db = getDb();
  const attachmentId = nanoid();
  await db.insert(attachments).values({
    id: attachmentId,
    documentId: params.documentId,
    filename: params.filename,
    mimeType: params.mimeType,
    storagePath: params.storagePath,
    extractedText: params.extractedText,
    createdAt: new Date()
  });

  if (params.chunks.length) {
    await db.insert(documentContextChunks).values(
      params.chunks.map((content, index) => ({
        id: nanoid(),
        documentId: params.documentId,
        attachmentId,
        chunkIndex: index,
        content,
        embedding: null,
        createdAt: new Date()
      }))
    );
  }

  return attachmentId;
}

export async function getAttachmentContext(documentId: string) {
  await ensureDatabase();
  const db = getDb();
  const chunks = await db
    .select()
    .from(documentContextChunks)
    .where(eq(documentContextChunks.documentId, documentId))
    .orderBy(asc(documentContextChunks.chunkIndex))
    .limit(8);

  return chunks.map((chunk) => chunk.content).join("\n\n");
}
