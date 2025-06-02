import { createAnthropic } from '@ai-sdk/anthropic'
import { createCohere } from '@ai-sdk/cohere'
import { createDeepSeek } from '@ai-sdk/deepseek'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createXai } from '@ai-sdk/xai'
import { createOllama } from 'ollama-ai-provider'

export const llmProviderIds = ['anthropic', 'cohere', 'deepseek', 'google-generative-ai', 'mistral', 'openai', 'x-ai', 'ollama'] as const
export type LLMProviderId = typeof llmProviderIds[number]

export interface UseLLMProviderOptions {
  credentials: {
    apiKey?: string
  }
  configuration?: {
    baseUrl?: string
    headers?: Record<string, string>
  }
}

export function useLLMProvider(id: LLMProviderId, options: UseLLMProviderOptions) {
  switch (id) {
    case 'anthropic':
      return createAnthropic({
        apiKey: options.credentials.apiKey,
        headers: options.configuration?.headers,
      })

    case 'cohere':
      return createCohere({
        apiKey: options.credentials.apiKey,
        headers: options.configuration?.headers,
      })

    case 'deepseek':
      return createDeepSeek({
        apiKey: options.credentials.apiKey,
        headers: options.configuration?.headers,
      })

    case 'google-generative-ai':
      return createGoogleGenerativeAI({
        apiKey: options.credentials.apiKey,
        headers: options.configuration?.headers,
      })

    case 'mistral':
      return createMistral({
        apiKey: options.credentials.apiKey,
        headers: options.configuration?.headers,
      })

    case 'openai': {
      const isOpenRouter = options.configuration?.baseUrl === 'https://openrouter.ai/api/v1'
      const hasCustomBaseUrl = options.configuration?.baseUrl && options.configuration.baseUrl.length > 0

      let headers = options.configuration?.headers
      if (isOpenRouter) {
        headers = {
          ...headers,
          'HTTP-Referer': 'https://devu.hrdtr.dev/',
          'X-Title': 'Devu',
        }
      }

      return createOpenAI({
        apiKey: options.credentials.apiKey,
        baseURL: options.configuration?.baseUrl,
        compatibility: hasCustomBaseUrl ? 'compatible' : 'strict',
        headers,
      })
    }

    case 'x-ai':
      return createXai({
        apiKey: options.credentials.apiKey,
        headers: options.configuration?.headers,
      })

    case 'ollama':
      return createOllama({
        baseURL: options.configuration?.baseUrl
          ? options.configuration.baseUrl.trim().endsWith('/api') || options.configuration.baseUrl.trim().endsWith('/api/')
            ? options.configuration.baseUrl.trim().replace(/\/$/, '')
            : `${options.configuration.baseUrl}/api`
          : undefined,
        headers: options.configuration?.headers,
      })

    default:
      throw new Error(`Unknown provider: ${id}`)
  }
}

export type LLMProvider = ReturnType<typeof useLLMProvider>
