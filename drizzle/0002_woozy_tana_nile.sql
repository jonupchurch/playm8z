CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maintenanceMode" boolean DEFAULT false NOT NULL,
	"maintenanceMessage" text
);
--> statement-breakpoint
-- Seed the single settings row so the table is never actually empty
-- (data-model.md's State notes) -- get-settings.ts can rely on a row
-- always existing rather than handling a "no row yet" case.
INSERT INTO "settings" ("maintenanceMode", "maintenanceMessage") VALUES (false, NULL);
