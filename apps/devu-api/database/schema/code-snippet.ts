import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Profiles table
export const codeSnippet = pgTable('code_snippet', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).notNull().defaultNow(),
  name: text('name').notNull(),
  language: text('language').notNull(),
  code: text('code').notNull(),
  notes: text('notes'),
}, table => [
  index('code_snippet_created_at_idx').on(table.createdAt),
  index('code_snippet_last_updated_at').on(table.createdAt),
  index('code_snippet_name_idx').on(table.name),
  index('code_snippet_language_idx').on(table.language),
])
