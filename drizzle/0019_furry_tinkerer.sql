CREATE TABLE "warnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"moderatorId" uuid NOT NULL,
	"postingId" uuid,
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "autoFlagReason" text;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "moderationReviewedAt" timestamp;--> statement-breakpoint
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_moderatorId_user_id_fk" FOREIGN KEY ("moderatorId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warnings" ADD CONSTRAINT "warnings_postingId_postings_id_fk" FOREIGN KEY ("postingId") REFERENCES "public"."postings"("id") ON DELETE set null ON UPDATE no action;