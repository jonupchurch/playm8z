CREATE TABLE "forumReplies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"threadId" uuid NOT NULL,
	"authorId" uuid NOT NULL,
	"body" text NOT NULL,
	"quotedReplyId" uuid,
	"likes" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"targetType" text NOT NULL,
	"targetId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "likes_userId_targetType_targetId_unique" UNIQUE("userId","targetType","targetId")
);
--> statement-breakpoint
CREATE TABLE "threadSubscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"threadId" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "forumReplies" ADD CONSTRAINT "forumReplies_threadId_forumThreads_id_fk" FOREIGN KEY ("threadId") REFERENCES "public"."forumThreads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forumReplies" ADD CONSTRAINT "forumReplies_authorId_user_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forumReplies" ADD CONSTRAINT "forumReplies_quotedReplyId_forumReplies_id_fk" FOREIGN KEY ("quotedReplyId") REFERENCES "public"."forumReplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threadSubscriptions" ADD CONSTRAINT "threadSubscriptions_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threadSubscriptions" ADD CONSTRAINT "threadSubscriptions_threadId_forumThreads_id_fk" FOREIGN KEY ("threadId") REFERENCES "public"."forumThreads"("id") ON DELETE cascade ON UPDATE no action;