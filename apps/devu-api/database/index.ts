import type { Extension, PGliteInterfaceExtensions } from '@electric-sql/pglite'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { config } from '@/config'
import { PGlite } from '@electric-sql/pglite'
import { vector } from '@electric-sql/pglite/vector'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from './schema'

/* eslint-disable perfectionist/sort-imports, antfu/no-import-node-modules-by-path, antfu/no-import-dist */
// PGLite static assets
// @ts-expect-error pglite.wasm
import PGLiteWasm from '../../../node_modules/@electric-sql/pglite/dist/pglite.wasm' with { loader: 'wasm' }
// @ts-expect-error pglite.data
import PGLiteFSBundle from '../../../node_modules/@electric-sql/pglite/dist/pglite.data' with { loader: 'file' }

// PGlite extensions
// @ts-expect-error vector.tar.gz
import PGLiteVectorExtension from '../../../node_modules/@electric-sql/pglite/dist/vector.tar.gz' with { loader: 'file' }
import { mkdirSync } from 'node:fs'
/* eslint-enable perfectionist/sort-imports, antfu/no-import-node-modules-by-path, antfu/no-import-dist */

export {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  ilike,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  max,
  min,
  ne,
  or,
  sql,
} from 'drizzle-orm'

export type PGliteClient = PGlite & PGliteInterfaceExtensions<{ vector: typeof vector }>
export type DB = ReturnType<typeof useDatabase>

function resolveAssetPath(path: string) {
  if (config.appResourcesPath) {
    return join(config.appResourcesPath, path)
  }
  return path
}

export async function createClient(dataDir: string) {
  mkdirSync(dataDir, { recursive: true })
  const fsBundle = Bun.file(resolveAssetPath(PGLiteFSBundle))
  const wasm = Bun.file(resolveAssetPath(PGLiteWasm))

  const client = await PGlite.create(dataDir, {
    fsBundle,
    wasmModule: await WebAssembly.compile(await wasm.arrayBuffer()),
    extensions: {
      // Modified version of @electric-sql/pglite/vector to work with custom bundlePath url
      // Source: https://github.com/electric-sql/pglite/blob/71707ff970508fa1f8db6ed1d170f31194bf89e6/packages/pglite/src/vector/index.ts
      vector: {
        ...vector,
        setup: async (_pg, emscriptenOpts) => {
          return {
            emscriptenOpts,
            bundlePath: pathToFileURL(resolveAssetPath(PGLiteVectorExtension)),
          }
        },
      } satisfies Extension,
    },
  })
  await client.waitReady // Needed, otherwise the drizzle migrate command will fail
  return client
}

export function useDatabase(client: PGliteClient) {
  const db = drizzle(client, { schema })
  return db
}

export function createId() {
  return Bun.randomUUIDv7()
}

export { schema }
