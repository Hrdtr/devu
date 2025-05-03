import { createGlobalState } from '@vueuse/core'
import { ref } from 'vue'

export const useMainElementRef = createGlobalState(() => {
  const el = ref<HTMLDivElement>()

  return el
})
