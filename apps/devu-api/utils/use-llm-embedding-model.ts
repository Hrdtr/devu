import type { LLMProvider, LLMProviderId, UseLLMProviderOptions } from '@/utils/use-llm-provider'

export type useLLMEmbeddingModelOptions = { providerId: LLMProviderId } & UseLLMProviderOptions

export function useLLMEmbeddingModel(modelId: string, provider: LLMProvider) {
  return provider.textEmbeddingModel(modelId)
}

export type LLMEmbeddingModel = ReturnType<typeof useLLMEmbeddingModel>
