ALTER TABLE "user" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "avatarColor" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "platforms" text[];--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "ageGroup" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "vibe" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "playTimeSlots" text[];--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "gamesPlayed" text[];--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_handle_unique" UNIQUE("handle");