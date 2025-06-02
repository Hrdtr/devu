import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Profiles table
export const codeSnippet = sqliteTable('code_snippet', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  lastUpdatedAt: integer('last_updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  name: text('name').notNull(),
  language: text('language').notNull(),
  code: text('code').notNull(),
  notes: text('notes'),
}, table => [
  index('code_snippet_created_at_idx').on(table.createdAt),
  index('code_snippet_last_updated_at').on(table.lastUpdatedAt),
  index('code_snippet_name_idx').on(table.name),
  index('code_snippet_language_idx').on(table.language),
])
