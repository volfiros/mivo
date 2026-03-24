import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { config } from "@/lib/config";

let database: ReturnType<typeof drizzle> | null = null;
let pool: Pool | null = null;
let ensured = false;

export function getDb() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is missing");
  }

  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl });
    database = drizzle(pool);
  }

  return database!;
}

export async function ensureDatabase() {
  if (ensured) {
    return;
  }

  const db = getDb();

  await db.execute(sql`
    create table if not exists documents (
      id text primary key,
      content_type text not null,
      title text not null,
      status text not null,
      current_content_json jsonb not null,
      current_version_id text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists document_versions (
      id text primary key,
      document_id text not null,
      version_number integer not null,
      checkpoint_version_number integer not null,
      storage_mode text not null,
      base_version_id text,
      full_snapshot_json jsonb,
      json_patch jsonb,
      change_source text not null,
      prompt_snapshot jsonb,
      model_snapshot jsonb,
      created_at timestamptz not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists generation_jobs (
      id text primary key,
      document_id text not null,
      target_version_id text,
      mode text not null,
      status text not null,
      request_payload jsonb not null,
      progress integer not null default 0,
      error text,
      started_at timestamptz,
      completed_at timestamptz,
      created_at timestamptz not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists generation_events (
      id text primary key,
      job_id text not null,
      sequence integer not null,
      event_type text not null,
      payload jsonb not null,
      created_at timestamptz not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists attachments (
      id text primary key,
      document_id text not null,
      filename text not null,
      mime_type text not null,
      storage_path text not null,
      extracted_text text not null,
      created_at timestamptz not null default now()
    );
  `);

  await db.execute(sql`
    create table if not exists document_context_chunks (
      id text primary key,
      document_id text not null,
      attachment_id text not null,
      chunk_index integer not null,
      content text not null,
      embedding jsonb,
      created_at timestamptz not null default now()
    );
  `);

  ensured = true;
}
