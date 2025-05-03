import { parseArgs } from 'node:util'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { showRoutes } from 'hono/dev'
import { HTTPException } from 'hono/http-exception'
import { ZodError } from 'zod'
import * as utilities from './utilities'

const { values: argv } = parseArgs({
  args: Bun.argv,
  options: {
    port: {
      type: 'string',
      short: 'p',
    },
  },
  strict: true,
  allowPositionals: true,
})

const app = new Hono()
app.use('/*', cors())

app.get('/ping', (c) => {
  return c.text('pong')
})

app.get('/utilities', (c) => {
  return c.json(Object.values(utilities).map(utility => utility.meta))
})

for (const utility of Object.values(utilities)) {
  app.get(`/utilities/${utility.meta.id}`, (c) => {
    return c.json(utility.meta)
  })

  app.get(`/utilities/${utility.meta.id}/schema`, (c) => {
    return c.json(utility.schema.input)
  })

  app.post(`/utilities/${utility.meta.id}/invoke`, async (c) => {
    try {
      const { input, options } = (await c.req.json()) ?? {}
      return c.json(await utility.invoke(input, options))
    }
    catch (err) {
      if (err instanceof ZodError) {
        throw new HTTPException(400, err)
      }
      throw new HTTPException(500)
    }
  })
}

showRoutes(app)

export default {
  port: argv.port || Bun.env.PORT || 3000,
  fetch: app.fetch,
}
