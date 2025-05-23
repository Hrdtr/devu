import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// Profiles table
export const codePlaygroundExecutionHistory = pgTable('code_playground_execution_history', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  playground: text('playground').notNull(),
  code: text('code').notNull(),
  output: jsonb('output'),
}, table => [
  index('code_playground_execution_history_created_at_idx').on(table.createdAt),
  index('code_playground_execution_history_playground_idx').on(table.playground),
])
