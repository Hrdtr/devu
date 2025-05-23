import type { MaybeRefOrGetter } from 'vue'
import type { ApiRouteOutput } from './use-api'
import { createSharedComposable } from '@vueuse/core'
import { useFilter } from 'reka-ui'
import { onMounted, ref, toValue, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from './use-api'

export function _useUtility({ search }: { search?: MaybeRefOrGetter<string> } = {}) {
  const { client, safe } = useApi()
  const { contains } = useFilter({ sensitivity: 'base' })

  const utilityState = ref<'idle' | 'loading' | 'loadingMore' | 'pending'>('idle')

  const allUtilities = ref<ApiRouteOutput['utility']['all']>([])
  const utilities = ref<ApiRouteOutput['utility']['all']>([])

  const loadUtilities = async () => {
    if (utilityState.value !== 'idle') {
      return
    }
    utilityState.value = 'loading'
    const { data, error } = await safe(client.utility.all({
      search: toValue(search),
    }))
    if (error) {
      toast.error(error?.message || String(error))
      utilityState.value = 'idle'
      return
    }
    allUtilities.value = data
    const searchKeyword = toValue(search)
    utilities.value = searchKeyword ? allUtilities.value.filter(p => contains(p.name, searchKeyword)) : allUtilities.value
    utilityState.value = 'idle'
  }
  onMounted(loadUtilities)
  watch(() => toValue(search), loadUtilities)

  return {
    utilityState,
    utilities,
    loadUtilities,
  }
}
export const useUtility = createSharedComposable(_useUtility)
