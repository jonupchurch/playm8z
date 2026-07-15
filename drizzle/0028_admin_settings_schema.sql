ALTER TABLE "settings" ADD COLUMN "siteName" text DEFAULT 'playm8z' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "supportEmail" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "defaultTheme" text DEFAULT 'dark' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "phraseFilterEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "linkFilterEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "boostFilterEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "newAccountReviewEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "bannedPhrases" text[] DEFAULT '{"free nitro","cheap boosting","click here","dm for rates","gift-nitro"}' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "autoHideEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "autoHideThreshold" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "autoEscalateSeverity" text DEFAULT 'high' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "discordFlag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "groupsFlag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "ratingsFlag" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "forumFlag" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "tabletopFlag" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "openSignups" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "discoverableByDefault" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;