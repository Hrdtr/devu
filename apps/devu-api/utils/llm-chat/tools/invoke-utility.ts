import { createTool } from '@mastra/core'
import { z } from 'zod/v3'
import * as utilities from '@/routes/utilities/src'

// Building type declaration throws error if not imported
// eslint-disable-next-line perfectionist/sort-imports, unused-imports/no-unused-imports
import * as _ from '@mastra/core/tools'

let parameterGuidanceForDescription = '\nSpecific parameter structures depend on the \'utility_id\':\n\n'
for (const utility of Object.values(utilities)) {
  if (utility && utility.meta) {
    parameterGuidanceForDescription += `${utility.meta.name} (${utility.meta.id}): ${utility.meta.description}\n`
    parameterGuidanceForDescription += `input:\n${JSON.stringify(utility.meta.schema.input, null, 2)}\n`
    parameterGuidanceForDescription += `options:\n${JSON.stringify(utility.meta.schema.options, null, 2)}\n\n`
  }
}

export const invokeUtility = createTool({
  id: 'devu.invoke_utility',
  description: `Acts as a dispatcher to invoke one of several available utilities. You MUST provide a valid 'utility_id'. The 'input' (object) and optional 'options' (object) must match the requirements of the selected utility.\n\n${parameterGuidanceForDescription}`,
  inputSchema: z.object({
    utility_id: z.string().describe('The identifier of the specific utility to invoke. The required structure for \'input\' and \'options\' entirely depends on this ID.'),
    input: z.any().describe('The input parameters for the utility specified by \'utility_id\'. It\'s structure is variable and utility-dependent.'),
    options: z.any().optional().describe('An optional additional options for the selected utility. Structure is variable. Omit if not needed or not applicable.'),
  }),
  execute: async ({ context }) => {
    // Validate utility_id
    if (!context.utility_id || typeof context.utility_id !== 'string') {
      return 'Error: utility_id must be a non-empty string'
    }

    // Validate input
    if (!context.input) {
      return 'Error: input must not be empty'
    }

    const utility = Object.values(utilities).find(u => u.meta.id === context.utility_id)
    if (!utility) {
      console.error('Unknown utility:', context.utility_id)
      return `Unknown utility: ${context.utility_id}, available utilities are: ${Object.values(utilities).map(u => u.meta.id).join(', ')}`
    }

    try {
      const result = await utility.invoke(context.input, context.options || null)
      return result
    }
    catch (error) {
      console.error('Error invoking utility:', error)
      return `Error invoking utility ${context.utility_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})
