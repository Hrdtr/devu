import type { ToolDefinition } from '@langchain/core/language_models/base'
import type { Tool } from '@langchain/core/tools'
import type { InferSelectModel } from 'drizzle-orm'
import type { schema } from '@/database'
import { ChatAnthropic } from '@langchain/anthropic'
// import { tool } from '@langchain/core/tools'
import { ChatCohere } from '@langchain/cohere'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { ChatGroq } from '@langchain/groq'
import { ChatMistralAI } from '@langchain/mistralai'
import { ChatOllama } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'
import { ChatXAI } from '@langchain/xai'
import { ORPCError } from '@orpc/server'
import * as utilities from '@/routes/utilities/src'

function createLLMChatClient(profile: InferSelectModel<typeof schema.llmChatProfile>) {
  switch (profile.provider) {
    case 'anthropic':
      return new ChatAnthropic({
        apiKey: profile.credentials.apiKey,
        model: profile.model,
      })
    case 'cohere':
      return new ChatCohere({
        apiKey: profile.credentials.apiKey,
        model: profile.model,
      })
    case 'google-genai':
      return new ChatGoogleGenerativeAI({
        apiKey: profile.credentials.apiKey,
        model: profile.model,
      })
    case 'groq':
      return new ChatGroq({
        apiKey: profile.credentials.apiKey,
        model: profile.model,
      })
    case 'mistralai':
      return new ChatMistralAI({
        apiKey: profile.credentials.apiKey,
        model: profile.model,
      })
    case 'ollama':
      return new ChatOllama({
        baseUrl: profile.configuration.baseUrl,
        model: profile.model,
      })
    case 'openai':
      return new ChatOpenAI({
        apiKey: profile.credentials.apiKey,
        configuration: profile.configuration.baseUrl
          ? {
              baseURL: profile.configuration.baseUrl,
              defaultHeaders:
              profile.configuration.baseUrl && profile.configuration.baseUrl === 'https://openrouter.ai/api/v1'
                ? {
                    'HTTP-Referer': 'https://devu.hrdtr.dev/',
                    'X-Title': 'Devu',
                  }
                : undefined,
            }
          : undefined,
        model: profile.model,
      })
    case 'xai':
      return new ChatXAI({
        apiKey: profile.credentials.apiKey,
        model: profile.model,
      })
    default:
      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: `Unknown provider: ${profile.provider}`,
      })
  }
}

export type LLMChatClient = ReturnType<typeof createLLMChatClient>

createLLMChatClient.withTools = (
  profile: InferSelectModel<typeof schema.llmChatProfile>,
  tools: ('utility' | 'codeSnippet')[] = ['utility', 'codeSnippet'],
) => {
  const createTools = {
    utility: createUtilityTools,
    codeSnippet: () => [] as Tool[],
  }

  const boundTools = [] as (Tool | ToolDefinitionWithInvokeFn)[]
  for (const tool of tools) {
    const tools = createTools[tool]()
    boundTools.push(...tools)
  }

  return {
    client: createLLMChatClient(profile).bindTools(boundTools),
    tools: boundTools,
  }
}

export { createLLMChatClient }

// Tools definitions
type ToolDefinitionWithInvokeFn = ToolDefinition & { invoke: (args: any) => any }

function createUtilityTools(): ToolDefinitionWithInvokeFn[] {
  function preprocessSchema<T>(schema: T | undefined): T | { type: 'object', description?: string } {
    if (schema === undefined) {
      return { type: 'object', description: 'No parameters' } as T // Default schema for undefined
    }
    if (Array.isArray(schema)) {
      return schema.map(item => preprocessSchema(item)) as T // Recurse for items in array
    }
    else if (schema && typeof schema === 'object') {
      const newObj: any = {}
      for (const key in schema) {
        if (key === 'ui' || key === 'format') {
          continue
        }
        // Ensure 'type' for enums
        if (key === 'enum' && !('type' in schema) && !newObj.type) { // Check newObj.type to avoid overriding if already set
          newObj.type = 'string' // Default to string for enums, adjust if other types are possible
        }

        if (key === 'properties' || key === 'patternProperties') {
          newObj[key] = {}
          for (const propKey in schema[key as keyof T]) { // Type assertion for safety
            newObj[key][propKey] = preprocessSchema(schema[key as keyof T][propKey])
          }
        }
        else if (key === 'items' || key === 'anyOf' || key === 'oneOf' || key === 'allOf') {
          // Handle cases where these keys might hold a single schema object or an array
          const value = schema[key as keyof T]
          if (Array.isArray(value)) {
            newObj[key] = value.map(subSchema => preprocessSchema(subSchema))
          }
          else if (value && typeof value === 'object') {
            newObj[key] = preprocessSchema(value)
          }
          else {
            newObj[key] = value // Should not happen for valid schemas of these keywords
          }
        }
        else if (typeof schema[key as keyof T] === 'object' && schema[key as keyof T] !== null) {
          newObj[key] = preprocessSchema(schema[key as keyof T])
        }
        else {
          newObj[key] = schema[key as keyof T]
        }
      }
      // If the original schema was empty and resulted in an empty newObj, ensure it's a valid type
      if (Object.keys(newObj).length === 0 && !newObj.type && (schema as any).type === undefined) {
        // If an empty object schema results, explicitly make it type object
        // This can happen if the input schema was just {}
        // Check original 'type' to not override if it was, e.g. {type: 'null'}
        return { type: 'object' } as T
      }
      return newObj
    }
    else {
      return schema
    }
  }
  let parameterGuidanceForDescription = '\nSpecific parameter structures depend on the \'utility_id\':\n\n'
  for (const utility of Object.values(utilities)) {
    if (utility && utility.meta) {
      parameterGuidanceForDescription += `${utility.meta.name} (${utility.meta.id}): ${utility.meta.description}\n`
      parameterGuidanceForDescription += `input:\n${JSON.stringify(preprocessSchema(utility.meta.schema.input), null, 2)}\n`
      parameterGuidanceForDescription += `options:\n${JSON.stringify(preprocessSchema(utility.meta.schema.options), null, 2)}\n\n`
    }
  }

  return [
    {
      type: 'function',
      function: {
        name: 'invoke_utility',
        description: `Acts as a dispatcher to invoke one of several available utilities. You MUST provide a valid 'utility_id'. The 'input' (object) and optional 'options' (object) must match the requirements of the selected utility.\n\n${parameterGuidanceForDescription}`,
        parameters: {
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
        },
      },
      invoke: async (args: { utility_id: string, input: any, options: any }) => {
        const utility = Object.values(utilities).find(u => u.meta.id === args.utility_id)
        if (!utility) {
          return `Unknown utility: ${args.utility_id}, available utilities are: ${Object.values(utilities).map(u => u.meta.id).join(', ')}`
        }
        const result = await utility.invoke(args.input, args.options || null)
        return result
      },
    } satisfies ToolDefinitionWithInvokeFn,
    // Definition with `tool` not work here, because the input validation is still uses Zod even though the input is not a Zod schema
    // Need to wait for Zod v4 support to be merged.
    // See https://github.com/langchain-ai/langchainjs/pull/8261
    //
    // tool<any>(
    //   async (
    //     args: {
    //       utility_id: string
    //       input: any
    //       options?: any
    //     },
    //   ) => {
    //     const utility = Object.values(utilities).find(u => u.meta.id === args.utility_id)
    //     if (!utility) {
    //       return `Unknown utility: ${args.utility_id}, available utilities are: ${Object.values(utilities).map(u => u.meta.id).join(', ')}`
    //     }
    //     const result = await utility.invoke(args.input, args.options || null)
    //     return result
    //   },
    //   {
    //     name: `invoke_utility`,
    //     description: `Acts as a dispatcher to invoke one of several available utilities. You MUST provide a valid 'utility_id'. The 'input' (object) and optional 'options' (object) must match the requirements of the selected utility.\n\n${parameterGuidanceForDescription}`,
    //     verbose: true,
    //     verboseParsingErrors: true,
    //     schema: {
    //       type: 'object',
    //       properties: {
    //         utility_id: {
    //           type: 'string',
    //           description: `The identifier of the specific utility to invoke. The required structure for 'input' and 'options' entirely depends on this ID.`,
    //           enum: Object.values(utilities).map(u => u.meta.id),
    //         },
    //         input: {
    //           type: 'object',
    //           description: 'A JSON object containing the input parameters for the utility specified by \'utility_id\'. Its structure is variable and utility-dependent.',
    //         },
    //         options: {
    //           type: 'object',
    //           description: 'An optional JSON object for additional options for the selected utility. Structure is variable. Omit or pass an empty object {} if not needed or not applicable.',
    //         },
    //       },
    //       required: ['utility_id', 'input'],
    //     },
    //   },
    // ) satisfies Tool,
  ]
}
