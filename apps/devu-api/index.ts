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
import { config } from './config'
import { createClient, useDatabase } from './database'
import pkg from './package.json'
import * as routes from './routes'

// process.env.BUN_CONFIG_VERBOSE_FETCH = 'curl'

const client = await createClient({
  url: `file:${config.dbFilePath.app}`,
}, {
  migrationsFolder: resolve(join(dirname(fileURLToPath(import.meta.url)), 'database', 'migrations')),
})
const db = useDatabase(client)

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

    else if (pathname === '/proxy') {
      // Parse the request URL and target URL from query
      const url = new URL(request.url)
      const targetUrl = url.searchParams.get('url')
      if (!targetUrl) {
        return new Response('Missing \'url\' parameter', { status: 400 })
      }

      console.info(`[proxy] Proxying request to ${targetUrl}`)

      // Clone the incoming request (method, headers, body)
      const method = request.method
      const headers = new Headers(request.headers)
      headers.delete('host') // Don't forward 'host' header
      headers.delete('accept-encoding') // remove Accept-Encoding

      // Forward the request to the target
      try {
        const proxyResponse = await fetch(targetUrl, {
          method,
          headers,
          body: ['GET', 'HEAD'].includes(method) ? undefined : request.body,
          redirect: 'follow',
        })

        // Build response for the client
        const responseHeaders = new Headers(proxyResponse.headers)
        // Adjust CORS headers
        responseHeaders.set('Access-Control-Allow-Origin', '*')
        // Also remove Content-Encoding header just in case it still returned by the upstream server
        responseHeaders.delete('content-encoding')

        return new Response(proxyResponse.body, {
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          headers: responseHeaders,
        })
      }
      catch (err) {
        console.error('Proxy error:', err)
        return new Response('Error proxying request', { status: 500 })
      }
    }

    return new Response('Not Found', { status: 404 })
  },
})
