/* eslint-disable antfu/no-top-level-await */
import { dirname, join, resolve } from 'node:path'
// import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { OpenAPIGenerator } from '@orpc/openapi'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { RPCHandler } from '@orpc/server/fetch'
import { CORSPlugin } from '@orpc/server/plugins'
import {
  experimental_ZodSmartCoercionPlugin as ZodSmartCoercionPlugin,
  experimental_ZodToJsonSchemaConverter as ZodToJsonSchemaConverter,
} from '@orpc/zod/zod4'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { config } from './config'
import { createClient, useDatabase } from './database'
import pkg from './package.json'
import * as routes from './routes'

// process.env.BUN_CONFIG_VERBOSE_FETCH = 'curl'

const client = await createClient(join(config.appDataDir, 'data'))
const db = useDatabase(client)

console.info('Running database migrations...')
migrate(db, {
  migrationsFolder: resolve(join(dirname(fileURLToPath(import.meta.url)), 'database', 'migrations')),
})

const fetchHandler = new RPCHandler(routes, {
  plugins: [
    new CORSPlugin({ origin: '*' }),
    new ZodSmartCoercionPlugin(),
  ],
})

const openapiGenerator = new OpenAPIGenerator({
  schemaConverters: [
    new ZodToJsonSchemaConverter(),
  ],
})
const openapiHandler = new OpenAPIHandler(routes, {
  plugins: [
    new CORSPlugin({ origin: '*' }),
    new ZodSmartCoercionPlugin(),
  ],
})

Bun.serve({
  port: config.port,
  fetch: async (request) => {
    const { pathname } = new URL(request.url)

    if (pathname === '/') {
      return new Response('OK')
    }

    else if (pathname === '/api/reference') {
      const html = `
        <!doctype html>
        <html>
          <head>
            <title>Devu API Reference</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="icon" type="image/svg+xml" href="https://orpc.unnoq.com/icon.svg" />
          </head>
          <body>
            <script
              id="api-reference"
              data-url="/api/spec.json"
            >
            </script>
            <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
          </body>
        </html>
      `

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
        },
      })
    }

    else if (pathname === '/api/spec.json') {
      const spec = await openapiGenerator.generate(routes, {
        info: {
          title: 'Devu API',
          version: pkg.version,
        },
        servers: [{ url: '/api' }],
      })

      return new Response(JSON.stringify(spec), {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    }

    else if (pathname.startsWith('/api')) {
      const { matched, response } = await openapiHandler.handle(request, {
        prefix: '/api',
        context: { db },
      })

      if (matched) {
        return response
      }

      return new Response('Not Found', { status: 404 })
    }

    else if (pathname.startsWith('/rpc')) {
      const { matched, response } = await fetchHandler.handle(request, {
        prefix: '/rpc',
        context: { db },
      })

      if (matched) {
        return response
      }

      return new Response('Not Found', { status: 404 })
    }

    // This isn't really used rn. We need to wait for full offline support of LiveCodes
    // See: https://github.com/live-codes/livecodes/issues/807
    else if (pathname.startsWith('/livecodes')) {
      const path = resolve(join(dirname(fileURLToPath(import.meta.url)), 'static', ...pathname.split('/')))
      try {
        const file = Bun.file(path)
        if (await file.exists()) {
          return new Response(file)
        }

        return Response.redirect('/livecodes/index.html', 302)
      }
      catch {
        return new Response('Not found', { status: 404 })
      }
    }

    return new Response('Not Found', { status: 404 })
  },
})
