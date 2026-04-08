ALTER TABLE "user" ADD COLUMN "open_ai_api_key_encrypted" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "open_ai_api_key_last_four" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "open_ai_api_key_updated_at" timestamp;