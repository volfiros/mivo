import { and, asc, desc, eq, gt, inArray, max } from "drizzle-orm";
import { nanoid } from "nanoid";
import type { JSONContent } from "@tiptap/core";
import { applyPatch } from "fast-json-patch";
import type { Operation } from "fast-json-patch";
import { cosineSimilarity, embedSingleText } from "@/lib/ai/embeddings";
import { ensureDatabase, getDb } from "@/lib/db";
import { deleteStoredFile } from "@/lib/storage";
import {
  attachments,
  documents,
  documentContextChunks,
  documentVersions,
  generationEvents,
  generationJobs
} from "@/lib/db/schema";
import { createEmptyDocument, sanitizeDocumentContent } from "@/lib/schema/editor";
import {
  createVersionRecord,
  type StoredVersion,
  VERSION_CHECKPOINT_INTERVAL
} from "@/lib/versioning";
import type { ContentType } from "@/lib/schema/content";

type DocumentVersionRecord = typeof documentVersions.$inferSelect;
type AttachmentRecord = typeof attachments.$inferSelect;
type GenerationJobRecord = typeof generationJobs.$inferSelect;

export type UserDocumentSummary = Pick<
  typeof documents.$inferSelect,
  "id" | "ownerUserId" | "contentType" | "title" | "status" | "createdAt" | "updatedAt"
>;

export type OwnedDocumentRecord = Omit<typeof documents.$inferSelect, "currentContentJson"> & {
  currentContentJson: JSONContent;
  versions: DocumentVersionRecord[];
  attachments: AttachmentRecord[];
};

function toStoredVersion(version: DocumentVersionRecord): StoredVersion {
  return {
    ...version,
    storageMode: version.storageMode as StoredVersion["storageMode"],
    fullSnapshotJson: version.fullSnapshotJson as JSONContent | null,
    jsonPatch: (version.jsonPatch as unknown[]) ?? null
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isSameDocumentState(
  leftTitle: string,
  leftContent: JSONContent,
  rightTitle: string,
  rightContent: JSONContent
) {
  return (
    leftTitle === rightTitle &&
    JSON.stringify(leftContent) === JSON.stringify(rightContent)
  );
}

async function getOwnedDocumentSummary(userId: string, documentId: string) {
  await ensureDatabase();
  const db = getDb();
  const [document] = await db
    .select({
      id: documents.id,
      ownerUserId: documents.ownerUserId,
      contentType: documents.contentType,
      title: documents.title,
      status: documents.status,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt
    })
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.ownerUserId, userId)))
    .limit(1);

  return document ?? null;
}

export async function createDocument(params: {
  ownerUserId: string;
  contentType: string;
  title: string;
}) {
  await ensureDatabase();
  const db = getDb();
  const id = nanoid();
  const initialContent = createEmptyDocument();
  const createdAt = new Date();

  await db.insert(documents).values({
    id,
    ownerUserId: params.ownerUserId,
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
    versionNumber: 0,
    checkpointVersionNumber: 0,
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

  return getOwnedDocument(params.ownerUserId, id);
}

export async function getOwnedDocument(userId: string, id: string): Promise<OwnedDocumentRecord | null> {
  await ensureDatabase();
  const db = getDb();
  const [document] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.ownerUserId, userId)))
    .limit(1);

  if (!document) {
    return null;
  }

  const versions = await db
    .select()
    .from(documentVersions)
    .where(eq(documentVersions.documentId, id))
    .orderBy(desc(documentVersions.versionNumber));

  const uploads = await db
    .select()
    .from(attachments)
    .where(eq(attachments.documentId, id))
    .orderBy(desc(attachments.createdAt));

  return {
    ...document,
    currentContentJson: sanitizeDocumentContent(
      document.currentContentJson as JSONContent,
      document.contentType as ContentType,
    ),
    versions,
    attachments: uploads
  };
}

export async function listUserDocuments(userId: string, limit = 12): Promise<UserDocumentSummary[]> {
  await ensureDatabase();
  const db = getDb();
  return db
    .select({
      id: documents.id,
      ownerUserId: documents.ownerUserId,
      contentType: documents.contentType,
      title: documents.title,
      status: documents.status,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt
    })
    .from(documents)
    .where(eq(documents.ownerUserId, userId))
    .orderBy(desc(documents.updatedAt))
    .limit(limit);
}

export async function getLatestUserDocument(userId: string) {
  const [document] = await listUserDocuments(userId, 1);
  return document ?? null;
}

export async function deleteOwnedDocument(userId: string, documentId: string) {
  await ensureDatabase();
  const db = getDb();
  const document = await getOwnedDocumentSummary(userId, documentId);

  if (!document) {
    throw new Error("Document not found");
  }

  const documentAttachments = await db
    .select({
      id: attachments.id,
      storagePath: attachments.storagePath
    })
    .from(attachments)
    .where(eq(attachments.documentId, documentId));

  const jobs = await db
    .select({
      id: generationJobs.id
    })
    .from(generationJobs)
    .where(eq(generationJobs.documentId, documentId));

  if (jobs.length) {
    await db
      .delete(generationEvents)
      .where(inArray(generationEvents.jobId, jobs.map((job) => job.id)));
  }

  await db.delete(generationJobs).where(eq(generationJobs.documentId, documentId));
  await db.delete(documentVersions).where(eq(documentVersions.documentId, documentId));
  await db.delete(documentContextChunks).where(eq(documentContextChunks.documentId, documentId));
  await db.delete(attachments).where(eq(attachments.documentId, documentId));
  await db
    .delete(documents)
    .where(and(eq(documents.id, documentId), eq(documents.ownerUserId, userId)));

  await Promise.all(
    documentAttachments.map((attachment) => deleteStoredFile(attachment.storagePath))
  );
}

export async function saveDocumentContent(params: {
  userId: string;
  documentId: string;
  content: JSONContent;
  title?: string;
  changeSource: string;
  promptSnapshot?: unknown;
  modelSnapshot?: unknown;
}) {
  await ensureDatabase();
  const db = getDb();
  const current = await getOwnedDocument(params.userId, params.documentId);

  if (!current) {
    throw new Error("Document not found");
  }

  const nextTitle = params.title ?? current.title;
  const currentContent = sanitizeDocumentContent(
    current.currentContentJson,
    current.contentType as ContentType,
  );
  const nextContent = sanitizeDocumentContent(
    params.content,
    current.contentType as ContentType,
  );

  if (
    isSameDocumentState(
      current.title,
      currentContent,
      nextTitle,
      nextContent
    )
  ) {
    return current.currentVersionId;
  }

  const latestVersion = current.versions[0];
  const baseVersion = await findCheckpointBase(params.documentId, latestVersion.versionNumber);
  const nextVersion = createVersionRecord({
    checkpointBaseVersion: baseVersion,
    currentVersionNumber: latestVersion.versionNumber,
    nextDocument: nextContent
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
      currentContentJson: nextContent,
      currentVersionId: versionId,
      updatedAt: new Date()
    })
    .where(and(eq(documents.id, params.documentId), eq(documents.ownerUserId, params.userId)));

  return versionId;
}

export async function saveDocumentDraft(params: {
  userId: string;
  documentId: string;
  content: JSONContent;
  title?: string;
}) {
  await ensureDatabase();
  const db = getDb();
  const current = await getOwnedDocument(params.userId, params.documentId);

  if (!current) {
    throw new Error("Document not found");
  }

  const nextTitle = params.title ?? current.title;
  const currentContent = sanitizeDocumentContent(
    current.currentContentJson,
    current.contentType as ContentType,
  );
  const nextContent = sanitizeDocumentContent(
    params.content,
    current.contentType as ContentType,
  );

  if (
    isSameDocumentState(
      current.title,
      currentContent,
      nextTitle,
      nextContent
    )
  ) {
    return current.currentVersionId;
  }

  await db
    .update(documents)
    .set({
      title: nextTitle,
      currentContentJson: nextContent,
      updatedAt: new Date()
    })
    .where(and(eq(documents.id, params.documentId), eq(documents.ownerUserId, params.userId)));

  return current.currentVersionId;
}

async function findCheckpointBase(documentId: string, currentVersionNumber: number): Promise<StoredVersion | null> {
  await ensureDatabase();
  const db = getDb();

  const checkpointNumber =
    Math.floor(currentVersionNumber / VERSION_CHECKPOINT_INTERVAL) *
    VERSION_CHECKPOINT_INTERVAL;
  const [version] = await db
    .select()
    .from(documentVersions)
    .where(and(eq(documentVersions.documentId, documentId), eq(documentVersions.versionNumber, checkpointNumber)))
    .limit(1);

  if (!version) {
    const [first] = await db
      .select()
      .from(documentVersions)
      .where(and(eq(documentVersions.documentId, documentId), eq(documentVersions.versionNumber, 0)))
      .limit(1);

    return first
      ? toStoredVersion(first)
      : null;
  }

  return toStoredVersion(version);
}

export async function getDocumentVersionContent(params: {
  userId: string;
  documentId: string;
  versionId: string;
}) {
  await ensureDatabase();
  const db = getDb();
  const document = await getOwnedDocumentSummary(params.userId, params.documentId);

  if (!document) {
    throw new Error("Document not found");
  }

  const [version] = await db
    .select()
    .from(documentVersions)
    .where(and(eq(documentVersions.documentId, params.documentId), eq(documentVersions.id, params.versionId)))
    .limit(1);

  if (!version) {
    throw new Error("Version not found");
  }

  const hydratedVersion = toStoredVersion(version);

  if (hydratedVersion.storageMode === "snapshot" && hydratedVersion.fullSnapshotJson) {
    return {
      ...hydratedVersion,
      content: sanitizeDocumentContent(
        hydratedVersion.fullSnapshotJson,
        document.contentType as ContentType,
      )
    };
  }

  if (!hydratedVersion.baseVersionId || !hydratedVersion.jsonPatch) {
    throw new Error("Version is missing checkpoint data");
  }

  const [baseVersion] = await db
    .select()
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, params.documentId),
        eq(documentVersions.id, hydratedVersion.baseVersionId)
      )
    )
    .limit(1);

  if (!baseVersion) {
    throw new Error("Checkpoint version not found");
  }

  const hydratedBaseVersion = toStoredVersion(baseVersion);

  if (!hydratedBaseVersion.fullSnapshotJson) {
    throw new Error("Checkpoint snapshot is unavailable");
  }

  const content = applyPatch(
    cloneJson(hydratedBaseVersion.fullSnapshotJson),
    hydratedVersion.jsonPatch as readonly Operation[]
  ).newDocument as JSONContent;

  return {
    ...hydratedVersion,
    content: sanitizeDocumentContent(content, document.contentType as ContentType)
  };
}

export async function createGenerationJob(params: {
  userId: string;
  documentId: string;
  mode: string;
  requestPayload: unknown;
}) {
  await ensureDatabase();
  const db = getDb();
  const document = await getOwnedDocumentSummary(params.userId, params.documentId);

  if (!document) {
    throw new Error("Document not found");
  }

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

export async function getGenerationJobForUser(userId: string, jobId: string): Promise<GenerationJobRecord | null> {
  await ensureDatabase();
  const db = getDb();
  const [result] = await db
    .select({
      job: generationJobs
    })
    .from(generationJobs)
    .innerJoin(documents, eq(generationJobs.documentId, documents.id))
    .where(and(eq(generationJobs.id, jobId), eq(documents.ownerUserId, userId)))
    .limit(1);

  return result?.job ?? null;
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
  return db
    .select()
    .from(generationEvents)
    .where(eq(generationEvents.jobId, jobId))
    .orderBy(asc(generationEvents.sequence));
}

export async function getGenerationEventsSince(jobId: string, sequence: number) {
  await ensureDatabase();
  const db = getDb();
  return db
    .select()
    .from(generationEvents)
    .where(and(eq(generationEvents.jobId, jobId), gt(generationEvents.sequence, sequence)))
    .orderBy(asc(generationEvents.sequence));
}

export async function claimQueuedGenerationJob(jobId: string) {
  await ensureDatabase();
  const db = getDb();
  const [claimedJob] = await db
    .update(generationJobs)
    .set({
      status: "running",
      progress: 0,
      error: null,
      startedAt: new Date(),
      completedAt: null,
    })
    .where(and(eq(generationJobs.id, jobId), eq(generationJobs.status, "queued")))
    .returning({ id: generationJobs.id });

  return Boolean(claimedJob);
}

export async function createAttachmentRecord(params: {
  userId: string;
  documentId: string;
  filename: string;
  mimeType: string;
  storagePath: string;
  extractedText: string;
  chunks: Array<{
    content: string;
    embedding: number[] | null;
  }>;
}) {
  await ensureDatabase();
  const db = getDb();
  const document = await getOwnedDocumentSummary(params.userId, params.documentId);

  if (!document) {
    throw new Error("Document not found");
  }

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
      params.chunks.map((chunk, index) => ({
        id: nanoid(),
        documentId: params.documentId,
        attachmentId,
        chunkIndex: index,
        content: chunk.content,
        embedding: chunk.embedding,
        createdAt: new Date()
      }))
    );
  }

  return attachmentId;
}

export async function getAttachmentContext(params: {
  userId: string;
  documentId: string;
  retrievalQuery: string;
  attachmentIds?: string[];
}) {
  await ensureDatabase();
  const db = getDb();
  const document = await getOwnedDocumentSummary(params.userId, params.documentId);

  if (!document) {
    throw new Error("Document not found");
  }

  const filters = [
    eq(documentContextChunks.documentId, params.documentId)
  ];

  if (params.attachmentIds?.length) {
    filters.push(inArray(documentContextChunks.attachmentId, params.attachmentIds));
  }

  const chunks = await db
    .select()
    .from(documentContextChunks)
    .where(and(...filters))
    .orderBy(asc(documentContextChunks.chunkIndex));

  const fallbackContext = serializeRetrievedChunks(chunks);
  const normalizedQuery = params.retrievalQuery.trim();

  if (!normalizedQuery || !chunks.length) {
    return fallbackContext;
  }

  let queryEmbedding: number[] | null = null;

  try {
    queryEmbedding = await embedSingleText(normalizedQuery);
  } catch {
    return fallbackContext;
  }

  if (!queryEmbedding) {
    return fallbackContext;
  }

  const embeddedChunks = chunks
    .map((chunk) => ({
      ...chunk,
      parsedEmbedding: parseEmbeddingValue(chunk.embedding),
    }))
    .filter((chunk): chunk is typeof chunk & { parsedEmbedding: number[] } =>
      Array.isArray(chunk.parsedEmbedding),
    );

  if (!embeddedChunks.length) {
    return fallbackContext;
  }

  const rankedChunks = embeddedChunks
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding as number[], chunk.parsedEmbedding),
    }))
    .filter((chunk) => Number.isFinite(chunk.score))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (left.attachmentId !== right.attachmentId) {
        return left.attachmentId.localeCompare(right.attachmentId);
      }

      return left.chunkIndex - right.chunkIndex;
    });

  if (!rankedChunks.length) {
    return fallbackContext;
  }

  return serializeRetrievedChunks(rankedChunks);
}

const ATTACHMENT_CONTEXT_TOP_K = 8;
const ATTACHMENT_CONTEXT_MAX_CHARS = 9000;

function parseEmbeddingValue(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = value.filter((item): item is number => typeof item === "number");
  return normalized.length === value.length ? normalized : null;
}

function serializeRetrievedChunks(
  chunks: Array<{ content: string }>,
) {
  const selectedChunks: string[] = [];
  let currentLength = 0;

  for (const chunk of chunks.slice(0, ATTACHMENT_CONTEXT_TOP_K)) {
    const nextContent = chunk.content.trim();

    if (!nextContent) {
      continue;
    }

    const nextLength =
      currentLength + nextContent.length + (selectedChunks.length ? 2 : 0);

    if (selectedChunks.length && nextLength > ATTACHMENT_CONTEXT_MAX_CHARS) {
      break;
    }

    selectedChunks.push(nextContent);
    currentLength = nextLength;
  }

  return selectedChunks.join("\n\n");
}

export async function saveDocumentTitle(params: {
  userId: string;
  documentId: string;
  title: string;
}) {
  await ensureDatabase();
  const db = getDb();
  
  await db
    .update(documents)
    .set({
      title: params.title,
      updatedAt: new Date()
    })
    .where(and(eq(documents.id, params.documentId), eq(documents.ownerUserId, params.userId)));
}
