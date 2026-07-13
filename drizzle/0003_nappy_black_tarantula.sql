CREATE TABLE "postings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hostId" uuid NOT NULL,
	"game" text NOT NULL,
	"title" text NOT NULL,
	"blurb" text NOT NULL,
	"vibe" text NOT NULL,
	"region" text NOT NULL,
	"seatsTotal" integer NOT NULL,
	"seatsOpen" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "postings" ADD CONSTRAINT "postings_hostId_user_id_fk" FOREIGN KEY ("hostId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;