CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postingId" uuid NOT NULL,
	"applicantId" uuid NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"postingId" uuid NOT NULL,
	"askerId" uuid NOT NULL,
	"text" text NOT NULL,
	"reply" text,
	"repliedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savedListings" (
	"userId" uuid NOT NULL,
	"postingId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "savedListings_userId_postingId_pk" PRIMARY KEY("userId","postingId")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_postingId_postings_id_fk" FOREIGN KEY ("postingId") REFERENCES "public"."postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_applicantId_user_id_fk" FOREIGN KEY ("applicantId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_postingId_postings_id_fk" FOREIGN KEY ("postingId") REFERENCES "public"."postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_askerId_user_id_fk" FOREIGN KEY ("askerId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savedListings" ADD CONSTRAINT "savedListings_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savedListings" ADD CONSTRAINT "savedListings_postingId_postings_id_fk" FOREIGN KEY ("postingId") REFERENCES "public"."postings"("id") ON DELETE cascade ON UPDATE no action;