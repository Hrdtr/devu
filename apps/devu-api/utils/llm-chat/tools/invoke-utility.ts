import { jsonSchema, tool } from 'ai'
import * as utilities from '@/routes/utilities/src'

let parameterGuidanceForDescription = '\nSpecific parameter structures depend on the \'utility_id\':\n\n'
for (const utility of Object.values(utilities)) {
  if (utility && utility.meta) {
    parameterGuidanceForDescription += `${utility.meta.name} (${utility.meta.id}): ${utility.meta.description}\n`
    parameterGuidanceForDescription += `input:\n${JSON.stringify(utility.meta.schema.input, null, 2)}\n`
    parameterGuidanceForDescription += `options:\n${JSON.stringify(utility.meta.schema.options, null, 2)}\n\n`
  }
}

export const invokeUtility = tool({
  id: 'devu.invoke_utility' as const,
  description: `Acts as a dispatcher to invoke one of several available utilities. You MUST provide a valid 'utility_id'. The 'input' (object) and optional 'options' (object) must match the requirements of the selected utility.\n\n${parameterGuidanceForDescription}`,
  parameters: jsonSchema<{ utility_id: string, input: any, options: any }>({
    type: 'object',
    properties: {
      utility_id: {
        type: 'string',
        description: `The identifier of the specific utility to invoke. The required structure for 'input' and 'options' entirely depends on this ID.`,
        enum: Object.values(utilities).map(u => u.meta.id),
      },
      input: {
        type: 'object',
        description: 'A JSON object containing the input parameters for the utility specified by \'utility_id\'. Its structure is variable and utility-dependent.',
      },
      options: {
        type: 'object',
        description: 'An optional JSON object for additional options for the selected utility. Structure is variable. Omit or pass an empty object {} if not needed or not applicable.',
      },
    },
    required: ['utility_id', 'input'],
  }),
  execute: async (args) => {
    // Validate utility_id
    if (!args.utility_id || typeof args.utility_id !== 'string') {
      return 'Error: utility_id must be a non-empty string'
    }

    // Validate input
    if (!args.input || typeof args.input !== 'object') {
      return 'Error: input must be a valid object'
    }

    const utility = Object.values(utilities).find(u => u.meta.id === args.utility_id)
    if (!utility) {
      return `Unknown utility: ${args.utility_id}, available utilities are: ${Object.values(utilities).map(u => u.meta.id).join(', ')}`
    }
    
    try {
      const result = await utility.invoke(args.input, args.options || null)
      return result
    } catch (error) {
      return `Error invoking utility ${args.utility_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})
