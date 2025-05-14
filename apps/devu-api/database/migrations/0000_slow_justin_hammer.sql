CREATE TABLE "llm_chat" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text,
	"root_message_id" text NOT NULL,
	"active_branches" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"chat_id" text NOT NULL,
	"parent_id" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"branch" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_chat_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"credentials" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model" text NOT NULL,
	"additional_system_prompt" text
);
--> statement-breakpoint
ALTER TABLE "llm_chat_message" ADD CONSTRAINT "llm_chat_message_chat_id_llm_chat_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."llm_chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_chat_message" ADD CONSTRAINT "llm_chat_message_parent_id_llm_chat_message_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."llm_chat_message"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "llm_chat_created_at_idx" ON "llm_chat" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "llm_chat_title_idx" ON "llm_chat" USING btree ("title");--> statement-breakpoint
CREATE INDEX "llm_chat_root_message_id_idx" ON "llm_chat" USING btree ("root_message_id");--> statement-breakpoint
CREATE INDEX "llm_chat_message_created_at_idx" ON "llm_chat_message" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "llm_chat_message_chat_id_idx" ON "llm_chat_message" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "llm_chat_message_parent_id_idx" ON "llm_chat_message" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "llm_chat_message_branch_idx" ON "llm_chat_message" USING btree ("branch");--> statement-breakpoint
CREATE INDEX "llm_chat_profile_created_at_idx" ON "llm_chat_profile" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "llm_chat_profile_name_idx" ON "llm_chat_profile" USING btree ("name");--> statement-breakpoint
CREATE INDEX "llm_chat_profile_provider_idx" ON "llm_chat_profile" USING btree ("provider");