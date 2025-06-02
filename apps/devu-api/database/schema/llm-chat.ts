import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Profiles table
export const llmChatProfile = sqliteTable('llm_chat_profile', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastUpdatedAt: integer('last_updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  configuration: text('configuration', { mode: 'json' }).$type<{ baseUrl?: string }>().notNull().default({}),
  credentials: text('credentials', { mode: 'json' }).$type<{ apiKey?: string }>().notNull().default({}),
  model: text('model').notNull(),
  additionalSystemPrompt: text('additional_system_prompt'),
}, table => [
  index('llm_chat_profile_created_at_idx').on(table.createdAt),
  index('llm_chat_profile_last_updated_at_idx').on(table.lastUpdatedAt),
  index('llm_chat_profile_name_idx').on(table.name),
  index('llm_chat_profile_provider_idx').on(table.provider),
])

export const llmChatEmbeddingProfile = sqliteTable('llm_chat_embedding_profile', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastUpdatedAt: integer('last_updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
  configuration: text('configuration', { mode: 'json' }).$type<{ baseUrl?: string }>().notNull().default({}),
  credentials: text('credentials', { mode: 'json' }).$type<{ apiKey?: string }>().notNull().default({}),
  model: text('model').notNull(),
}, table => [
  index('llm_chat_embedding_profile_created_at_idx').on(table.createdAt),
  index('llm_chat_embedding_profile_last_updated_at_idx').on(table.lastUpdatedAt),
  index('llm_chat_embedding_profile_name_idx').on(table.name),
  index('llm_chat_embedding_profile_provider_idx').on(table.provider),
])

// Chats table
export const llmChat = sqliteTable('llm_chat', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastUpdatedAt: integer('last_updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  title: text('title'),
  rootMessageId: text('root_message_id').notNull(),
  activeBranches: text('active_branches', { mode: 'json' }).notNull().default(sql`'[]'`),
}, table => [
  index('llm_chat_created_at_idx').on(table.createdAt),
  index('llm_chat_last_updated_at_idx').on(table.lastUpdatedAt),
  index('llm_chat_title_idx').on(table.title),
  index('llm_chat_root_message_id_idx').on(table.rootMessageId),
])

// Messages table
export const llmChatMessage = sqliteTable('llm_chat_message', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  chatId: text('chat_id')
    .notNull()
    .references((): AnySQLiteColumn => llmChat.id, { onDelete: 'cascade' }),
  parentId: text('parent_id').references((): AnySQLiteColumn => llmChatMessage.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  branch: text('branch').notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<{ provider?: string, model?: string }>().notNull().default({}),
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

export const llmChatEmbeddingProfileRelations = relations(llmChatEmbeddingProfile, ({ many: _ }) => ({
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
