CREATE TABLE `code_snippet` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`name` text NOT NULL,
	`language` text NOT NULL,
	`code` text NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `code_snippet_created_at_idx` ON `code_snippet` (`created_at`);--> statement-breakpoint
CREATE INDEX `code_snippet_last_updated_at` ON `code_snippet` (`created_at`);--> statement-breakpoint
CREATE INDEX `code_snippet_name_idx` ON `code_snippet` (`name`);--> statement-breakpoint
CREATE INDEX `code_snippet_language_idx` ON `code_snippet` (`language`);--> statement-breakpoint
CREATE TABLE `llm_chat` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`title` text,
	`root_message_id` text NOT NULL,
	`active_branches` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `llm_chat_created_at_idx` ON `llm_chat` (`created_at`);--> statement-breakpoint
CREATE INDEX `llm_chat_last_updated_at_idx` ON `llm_chat` (`last_updated_at`);--> statement-breakpoint
CREATE INDEX `llm_chat_title_idx` ON `llm_chat` (`title`);--> statement-breakpoint
CREATE INDEX `llm_chat_root_message_id_idx` ON `llm_chat` (`root_message_id`);--> statement-breakpoint
CREATE TABLE `llm_chat_embedding_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`configuration` text DEFAULT '{}' NOT NULL,
	`credentials` text DEFAULT '{}' NOT NULL,
	`model` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `llm_chat_embedding_profile_created_at_idx` ON `llm_chat_embedding_profile` (`created_at`);--> statement-breakpoint
CREATE INDEX `llm_chat_embedding_profile_last_updated_at_idx` ON `llm_chat_embedding_profile` (`last_updated_at`);--> statement-breakpoint
CREATE INDEX `llm_chat_embedding_profile_name_idx` ON `llm_chat_embedding_profile` (`name`);--> statement-breakpoint
CREATE INDEX `llm_chat_embedding_profile_provider_idx` ON `llm_chat_embedding_profile` (`provider`);--> statement-breakpoint
CREATE TABLE `llm_chat_message` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`chat_id` text NOT NULL,
	`parent_id` text,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`branch` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `llm_chat`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `llm_chat_message`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `llm_chat_message_created_at_idx` ON `llm_chat_message` (`created_at`);--> statement-breakpoint
CREATE INDEX `llm_chat_message_chat_id_idx` ON `llm_chat_message` (`chat_id`);--> statement-breakpoint
CREATE INDEX `llm_chat_message_parent_id_idx` ON `llm_chat_message` (`parent_id`);--> statement-breakpoint
CREATE INDEX `llm_chat_message_branch_idx` ON `llm_chat_message` (`branch`);--> statement-breakpoint
CREATE TABLE `llm_chat_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`configuration` text DEFAULT '{}' NOT NULL,
	`credentials` text DEFAULT '{}' NOT NULL,
	`model` text NOT NULL,
	`additional_system_prompt` text
);
--> statement-breakpoint
CREATE INDEX `llm_chat_profile_created_at_idx` ON `llm_chat_profile` (`created_at`);--> statement-breakpoint
CREATE INDEX `llm_chat_profile_last_updated_at_idx` ON `llm_chat_profile` (`last_updated_at`);--> statement-breakpoint
CREATE INDEX `llm_chat_profile_name_idx` ON `llm_chat_profile` (`name`);--> statement-breakpoint
CREATE INDEX `llm_chat_profile_provider_idx` ON `llm_chat_profile` (`provider`);--> statement-breakpoint
CREATE TABLE `utility_invocation_history` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`utility` text NOT NULL,
	`input` text,
	`options` text,
	`output` text
);
--> statement-breakpoint
CREATE INDEX `utility_invocation_history_created_at_idx` ON `utility_invocation_history` (`created_at`);--> statement-breakpoint
CREATE INDEX `utility_invocation_history_utility_idx` ON `utility_invocation_history` (`utility`);