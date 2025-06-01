import type { Client, Config } from '@libsql/client'
import type { MigrationConfig } from 'drizzle-orm/migrator'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient as createLibSQLClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from './schema'

export { and, asc, count, desc, eq, gt, gte, isNotNull, isNull, like, lt, lte, max, min, ne, or, sql } from 'drizzle-orm'

export type LibSQLClient = Client
export type DB = ReturnType<typeof useDatabase>

const clients: Record<string, LibSQLClient> = {}
const clientsPromise: Record<string, Promise<LibSQLClient>> = {}

export async function createClient(config: Config, migrationConfig?: MigrationConfig): Promise<LibSQLClient> {
  if (clients[config.url]) {
    return Promise.resolve(clients[config.url]!)
  };
  if (clientsPromise[config.url]) {
    return clientsPromise[config.url]!
  };

  clientsPromise[config.url] = (async () => {
    try {
      if (config.url.startsWith('file:')) {
        mkdirSync(dirname(config.url), { recursive: true })
      }

      const libSQLClient = createLibSQLClient(config)
      if (migrationConfig) {
        console.info('Running database migrations...')
        const startTime = Date.now()
        try {
          const db = drizzle(libSQLClient, { schema })
          await migrate(db, migrationConfig)
          console.info(`Database migrations completed in ${Date.now() - startTime}ms.`)
        }
        catch (err) {
          console.error(`Database migrations failed.\n`, err)
          throw err
        }
      }

      clients[config.url] = libSQLClient

      return clients[config.url]!
    }
    catch (err) {
      delete clients[config.url] // allow retry on next call
      delete clientsPromise[config.url]
      throw err
    }
  })()

  return clientsPromise[config.url]!
}

export function useDatabase(client: LibSQLClient) {
  const db = drizzle(client, { schema })
  return db
}

export function createId() {
  return Bun.randomUUIDv7()
}

export { schema }
