-- Dev-only seed data, not real product rows (Post a Game, this
-- table's canonical writer, doesn't exist yet) -- cleared here since
-- the new NOT NULL columns below have no default; re-seed afterward
-- via npm run db:seed-postings.
DELETE FROM "postings";--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "genre" text NOT NULL;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "ageGroup" text NOT NULL;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "timeSlots" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "platform" text NOT NULL;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "micRequired" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "scheduledDate" timestamp;