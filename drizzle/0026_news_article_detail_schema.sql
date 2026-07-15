CREATE TABLE "savedNewsPosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"newsPostId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "savedNewsPosts_userId_newsPostId_unique" UNIQUE("userId","newsPostId")
);
--> statement-breakpoint
ALTER TABLE "newsPosts" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "savedNewsPosts" ADD CONSTRAINT "savedNewsPosts_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savedNewsPosts" ADD CONSTRAINT "savedNewsPosts_newsPostId_newsPosts_id_fk" FOREIGN KEY ("newsPostId") REFERENCES "public"."newsPosts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsPosts" ADD CONSTRAINT "newsPosts_slug_unique" UNIQUE("slug");