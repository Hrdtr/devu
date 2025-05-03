import { createGlobalState } from '@vueuse/core'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

export const usePageMeta = createGlobalState(() => {
  const title = ref<string>()

  const route = useRoute()
  watch(
    () => route.path,
    () => {
      title.value = undefined
    },
  )

  return { title }
})
