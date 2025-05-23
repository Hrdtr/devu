import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Profiles table
export const utilityInvocationHistory = pgTable('utility_invocation_history', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  utility: text('utility').notNull(),
  input: jsonb('input'),
  options: jsonb('options'),
  output: jsonb('output'),
}, table => [
  index('utility_invocation_history_created_at_idx').on(table.createdAt),
  index('utility_invocation_history_utility_idx').on(table.utility),
])
