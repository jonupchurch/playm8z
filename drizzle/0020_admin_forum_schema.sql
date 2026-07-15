ALTER TABLE "forumReplies" ADD COLUMN "removedAt" timestamp;--> statement-breakpoint
ALTER TABLE "forumReplies" ADD COLUMN "autoFlagReason" text;--> statement-breakpoint
ALTER TABLE "forumReplies" ADD COLUMN "moderationReviewedAt" timestamp;--> statement-breakpoint
ALTER TABLE "forumThreads" ADD COLUMN "autoFlagReason" text;--> statement-breakpoint
ALTER TABLE "forumThreads" ADD COLUMN "moderationReviewedAt" timestamp;--> statement-breakpoint
ALTER TABLE "warnings" ADD COLUMN "targetType" text;--> statement-breakpoint
ALTER TABLE "warnings" ADD COLUMN "targetId" uuid;
