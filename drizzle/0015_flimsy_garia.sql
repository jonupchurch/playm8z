CREATE TABLE "newsPosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"category" text NOT NULL,
	"cover" text,
	"readTimeMinutes" integer,
	"featured" boolean DEFAULT false NOT NULL,
	"upcoming" boolean DEFAULT false NOT NULL,
	"publishedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletterSubscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletterSubscribers_email_unique" UNIQUE("email")
);
