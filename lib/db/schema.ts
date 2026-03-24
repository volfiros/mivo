import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username")
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" })
  },
  (table) => ({
    userIdIdx: index("session_userId_idx").on(table.userId)
  })
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index("account_userId_idx").on(table.userId)
  })
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    identifierIdx: index("verification_identifier_idx").on(table.identifier)
  })
);

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    contentType: text("content_type").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull(),
    currentContentJson: jsonb("current_content_json").notNull(),
    currentVersionId: text("current_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    ownerUpdatedAtIdx: index("documents_owner_user_id_updated_at_idx").on(table.ownerUserId, table.updatedAt)
  })
);

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
