ALTER TABLE "newsPosts" ADD COLUMN "body" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "newsPosts" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;