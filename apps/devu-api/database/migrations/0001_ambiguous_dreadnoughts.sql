CREATE TABLE "code_playground_execution_history" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"playground" text NOT NULL,
	"code" text NOT NULL,
	"output" jsonb
);
--> statement-breakpoint
CREATE TABLE "code_snippet" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"language" text NOT NULL,
	"code" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "utility_invocation_history" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"utility" text NOT NULL,
	"input" jsonb,
	"options" jsonb,
	"output" jsonb
);
--> statement-breakpoint
CREATE INDEX "code_playground_execution_history_created_at_idx" ON "code_playground_execution_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "code_playground_execution_history_playground_idx" ON "code_playground_execution_history" USING btree ("playground");--> statement-breakpoint
CREATE INDEX "code_snippet_created_at_idx" ON "code_snippet" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "code_snippet_last_updated_at" ON "code_snippet" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "code_snippet_name_idx" ON "code_snippet" USING btree ("name");--> statement-breakpoint
CREATE INDEX "code_snippet_language_idx" ON "code_snippet" USING btree ("language");--> statement-breakpoint
CREATE INDEX "utility_invocation_history_created_at_idx" ON "utility_invocation_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "utility_invocation_history_utility_idx" ON "utility_invocation_history" USING btree ("utility");--> statement-breakpoint
CREATE INDEX "llm_chat_last_updated_at_idx" ON "llm_chat" USING btree ("last_updated_at");--> statement-breakpoint
CREATE INDEX "llm_chat_profile_last_updated_at_idx" ON "llm_chat_profile" USING btree ("last_updated_at");