CREATE TABLE "stored_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"mime_type" text NOT NULL,
	"filename" text,
	"data_base64" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
