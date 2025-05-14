import type { AnyProcedure, ErrorMap, Route } from '@orpc/server'
import type { Srv } from './srv'
import { oo } from '@orpc/openapi'
import { srv } from './srv'

type BaseRouteFn = Srv['route']
type RouteReturn<Route> =
  BaseRouteFn extends (arg: Route) => infer R
    ? R
    : never

function defineRoute<Def extends Route, T extends AnyProcedure & { errors?: (map: ErrorMap) => AnyProcedure }>(def: Def, cb: (os: RouteReturn<Def>) => T): T {
  const routed = srv.route(def) as RouteReturn<Def>
  const errors: ErrorMap = {}

  let procedure = cb(routed)
  if (procedure['~orpc'].route.path && /\{[^}]+\}/.test(procedure['~orpc'].route.path)) {
    errors.NOT_FOUND = oo.spec({ message: 'Resource not found.' }, current => ({
      ...current,
      responses: {
        ...(current.responses || {}),
        404: { ...(current.responses?.[404] || {}), description: 'Not Found' },
      },
    }))
  }
  if (procedure['~orpc'].inputSchema) {
    errors.BAD_REQUEST = oo.spec({ message: 'Invalid or malformed input.' }, current => ({
      ...current,
      responses: {
        ...(current.responses || {}),
        400: { ...(current.responses?.[400] || {}), description: 'Bad Request' },
      },
    }))
  }

  procedure = (procedure.errors
    ? procedure.errors(errors)
    : procedure) as T

  return procedure
}

export { defineRoute }
