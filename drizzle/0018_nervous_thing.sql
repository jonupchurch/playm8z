ALTER TABLE "forumThreads" ADD COLUMN "removedAt" timestamp;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "removedAt" timestamp;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "bannedAt" timestamp;