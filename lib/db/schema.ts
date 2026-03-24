import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  contentType: text("content_type").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  currentContentJson: jsonb("current_content_json").notNull(),
  currentVersionId: text("current_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const documentVersions = pgTable("document_versions", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  checkpointVersionNumber: integer("checkpoint_version_number").notNull(),
  storageMode: text("storage_mode").notNull(),
  baseVersionId: text("base_version_id"),
  fullSnapshotJson: jsonb("full_snapshot_json"),
  jsonPatch: jsonb("json_patch"),
  changeSource: text("change_source").notNull(),
  promptSnapshot: jsonb("prompt_snapshot"),
  modelSnapshot: jsonb("model_snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const generationJobs = pgTable("generation_jobs", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  targetVersionId: text("target_version_id"),
  mode: text("mode").notNull(),
  status: text("status").notNull(),
  requestPayload: jsonb("request_payload").notNull(),
  progress: integer("progress").default(0).notNull(),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const generationEvents = pgTable("generation_events", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull(),
  sequence: integer("sequence").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const attachments = pgTable("attachments", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  storagePath: text("storage_path").notNull(),
  extractedText: text("extracted_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const documentContextChunks = pgTable("document_context_chunks", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  attachmentId: text("attachment_id").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  embedding: jsonb("embedding"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
