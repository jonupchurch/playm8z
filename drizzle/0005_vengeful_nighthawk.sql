ALTER TABLE "postings" ALTER COLUMN "genre" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "recurring" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "voiceLink" text;