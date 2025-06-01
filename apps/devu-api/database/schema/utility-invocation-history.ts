import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// Profiles table
export const utilityInvocationHistory = sqliteTable('utility_invocation_history', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  utility: text('utility').notNull(),
  input: text('input', { mode: 'json' }),
  options: text('options', { mode: 'json' }),
  output: text('output', { mode: 'json' }),
}, table => [
  index('utility_invocation_history_created_at_idx').on(table.createdAt),
  index('utility_invocation_history_utility_idx').on(table.utility),
])
