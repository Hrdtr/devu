import { createGlobalState } from '@vueuse/core'
import { ref } from 'vue'

export const useLLMChatState = createGlobalState(() => {
  const chatId = ref<string>()
  const title = ref<string>()
  const scrollElementRef = ref<HTMLElement>()

  return { chatId, title, scrollElementRef }
})
