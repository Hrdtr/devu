import { createGlobalState } from '@vueuse/core'
import { ref } from 'vue'

export const useSidebarSearchKeyword = createGlobalState(() => {
  const keyword = ref('')
  return keyword
})
