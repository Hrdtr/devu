import type { MaybeRefOrGetter } from 'vue'
import type { ApiRouteOutput } from './use-api'
import { createGlobalState } from '@vueuse/core'
import { useFilter } from 'reka-ui'
import { onMounted, ref, toValue, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from './use-api'

export const useCodePlaygroundData = createGlobalState(() => {
  const codePlaygroundState = ref<'idle' | 'loading' | 'loadingMore' | 'pending'>('idle')
  const allCodePlaygrounds = ref<ApiRouteOutput['codePlayground']['all']>([])
  const codePlaygrounds = ref<ApiRouteOutput['codePlayground']['all']>([])

  return { codePlaygroundState, allCodePlaygrounds, codePlaygrounds }
})

export function useCodePlayground({ search }: { search?: MaybeRefOrGetter<string> } = {}) {
  const { client, safe } = useApi()
  const { contains } = useFilter({ sensitivity: 'base' })
  const { codePlaygroundState, allCodePlaygrounds, codePlaygrounds } = useCodePlaygroundData()

  const loadCodePlaygrounds = async () => {
    if (codePlaygroundState.value !== 'idle') {
      return
    }
    codePlaygroundState.value = 'loading'
    const { data, error } = await safe(client.codePlayground.all())
    if (error) {
      toast.error(error?.message || String(error))
      codePlaygroundState.value = 'idle'
      return
    }
    allCodePlaygrounds.value = data
    const searchKeyword = toValue(search)
    codePlaygrounds.value = searchKeyword ? allCodePlaygrounds.value.filter(p => contains(p.name, searchKeyword)) : allCodePlaygrounds.value
    codePlaygroundState.value = 'idle'
  }
  onMounted(loadCodePlaygrounds)
  watch(() => toValue(search), loadCodePlaygrounds)

  return {
    codePlaygroundState,
    codePlaygrounds,
    loadCodePlaygrounds,
  }
}
