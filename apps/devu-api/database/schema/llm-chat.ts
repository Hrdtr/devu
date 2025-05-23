import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Profiles table
export const llmChatProfile = pgTable('llm_chat_profile', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).notNull().defaultNow(),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  configuration: jsonb('configuration').$type<{ baseUrl?: string }>().notNull().default({}),
  credentials: jsonb('credentials').$type<{ apiKey?: string }>().notNull().default({}),
  model: text('model').notNull(),
  additionalSystemPrompt: text('additional_system_prompt'),
}, table => [
  index('llm_chat_profile_created_at_idx').on(table.createdAt),
  index('llm_chat_profile_last_updated_at_idx').on(table.lastUpdatedAt),
  index('llm_chat_profile_name_idx').on(table.name),
  index('llm_chat_profile_provider_idx').on(table.provider),
])

// Chats table
export const llmChat = pgTable('llm_chat', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).notNull().defaultNow(),
  title: text('title'),
  rootMessageId: text('root_message_id').notNull(),
  activeBranches: text('active_branches').array().notNull().default([]),
}, table => [
  index('llm_chat_created_at_idx').on(table.createdAt),
  index('llm_chat_last_updated_at_idx').on(table.lastUpdatedAt),
  index('llm_chat_title_idx').on(table.title),
  index('llm_chat_root_message_id_idx').on(table.rootMessageId),
])

// Messages table
export const llmChatMessage = pgTable('llm_chat_message', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  chatId: text('chat_id')
    .notNull()
    .references((): AnyPgColumn => llmChat.id, { onDelete: 'cascade' }),
  parentId: text('parent_id').references((): AnyPgColumn => llmChatMessage.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  branch: text('branch').notNull(),
  metadata: jsonb('metadata').$type<{ provider?: string, model?: string }>().notNull().default({}),
}, table => [
  index('llm_chat_message_created_at_idx').on(table.createdAt),
  index('llm_chat_message_chat_id_idx').on(table.chatId),
  index('llm_chat_message_parent_id_idx').on(table.parentId),
  index('llm_chat_message_branch_idx').on(table.branch),
])

// ------------------ RELATIONS ------------------

export const llmChatProfileRelations = relations(llmChatProfile, ({ many: _ }) => ({
  // No FK in schema yet, but add when linking profile to chat or messages
}))

export const llmChatRelations = relations(llmChat, ({ many }) => ({
  messages: many(llmChatMessage),
}))

export const llmChatMessageRelations = relations(llmChatMessage, ({ one, many }) => ({
  chat: one(llmChat, {
    fields: [llmChatMessage.chatId],
    references: [llmChat.id],
  }),
  parent: one(llmChatMessage, {
    fields: [llmChatMessage.parentId],
    references: [llmChatMessage.id],
  }),
  children: many(llmChatMessage),
}))
