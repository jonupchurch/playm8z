CREATE TABLE "auditEntries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actorId" uuid,
	"action" text NOT NULL,
	"category" text NOT NULL,
	"targetType" text,
	"targetId" uuid,
	"targetLabel" text,
	"reason" text,
	"meta" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auditEntries" ADD CONSTRAINT "auditEntries_actorId_user_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;