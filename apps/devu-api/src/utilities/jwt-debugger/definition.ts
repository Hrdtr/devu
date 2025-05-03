import { z } from 'zod'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'jwt-debugger',
  name: 'JWT Debugger',
  description: 'Debugs a JWT token.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The JWT token to debug.',
      ui: {
        label: 'Encoded Token',
        component: 'Textarea',
        attrs: {},
      },
    }),
    options: z.interface({
      'algorithm': z
        .enum([
          'HS256',
          'HS384',
          'HS512',
          'RS256',
          'RS384',
          'RS512',
          'ES256',
          'ES384',
          'ES512',
          'PS256',
          'PS384',
          'PS512',
        ])
        .default('HS256')
        .meta({
          description: 'The algorithm used to sign the JWT.',
          ui: {
            label: 'Algorithm',
            component: 'Select',
            attrs: {},
          },
        }),
      'secret?': z.string().meta({
        description: 'The secret used to sign the JWT.',
        ui: {
          label: 'Secret',
          component: 'Input',
          attrs: {
            type: 'text',
          },
        },
      }),
    }),
    output: z.interface({
      header: z.string().meta({
        description: 'The header of the JWT.',
        ui: {
          label: 'Header',
          component: 'CodeMirror',
          attrs: {
            lang: 'json',
            style: { 'min-height': '10rem' },
          },
        },
      }),
      payload: z.string().meta({
        description: 'The payload of the JWT.',
        ui: {
          label: 'Payload',
          component: 'CodeMirror',
          attrs: {
            lang: 'json',
            style: { 'min-height': '10rem' },
          },
        },
      }),
      signature: z.string().meta({
        description: 'The signature of the JWT.',
        ui: {
          label: 'Signature',
          component: 'Input',
          attrs: {
            type: 'text',
          },
        },
      }),
      signatureVerified: z.boolean().meta({
        description: 'Whether the signature is valid.',
        ui: {
          label: 'Signature Verified',
          component: 'Checkbox',
          attrs: {},
        },
      }),
    }),
  },
  dependencies: ['jsonwebtoken'],
  requiresInternet: false,
  tags: ['jwt', 'debugger'],
  related: [],
})

export type Input = z.infer<typeof schema.input>
export type Options = z.infer<typeof schema.options>
export type Output = z.infer<typeof schema.output>
