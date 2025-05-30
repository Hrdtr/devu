import type { LLMProvider, LLMProviderId, useLLMProvider, UseLLMProviderOptions } from '@/utils/use-llm-provider'

export type useLLMLanguageModelOptions = { providerId: LLMProviderId } & UseLLMProviderOptions

export function useLLMLanguageModel(modelId: string, provider: LLMProvider) {
  return provider.languageModel(modelId)
}

export type LLMLanguageModel = ReturnType<ReturnType<typeof useLLMProvider>['languageModel']>
