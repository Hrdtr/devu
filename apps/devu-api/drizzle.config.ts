import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  driver: 'pglite',
  schema: './database/schema',
  out: './database/migrations',
  // Not applicable since the data will be stored on user appdata dir.
  // The migration process handled inside process main entrypoint.
  // dbCredentials: {},
})
