import type { MaybeRefOrGetter } from 'vue'
import type { ApiRouteInput, ApiRouteOutput } from './use-api'
import { createGlobalState } from '@vueuse/core'
import { computed, onMounted, ref, toValue, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from './use-api'

export const useCodeSnippetData = createGlobalState(() => {
  const codeSnippetState = ref<'idle' | 'loading' | 'loadingMore' | 'pending'>('idle')
  const codeSnippets = ref<ApiRouteOutput['codeSnippet']['list']>({
    data: [],
    nextCursor: null,
  })

  return { codeSnippetState, codeSnippets }
})

export function useCodeSnippet({ search }: { search?: MaybeRefOrGetter<string> } = {}) {
  const { client, safe } = useApi()
  const { codeSnippetState, codeSnippets } = useCodeSnippetData()

  const loadCodeSnippets = async () => {
    if (codeSnippetState.value !== 'idle') {
      return
    }
    codeSnippetState.value = 'loading'
    const { data, error } = await safe(client.codeSnippet.list({
      search: toValue(search),
    }))
    if (error) {
      toast.error(error?.message || String(error))
      codeSnippetState.value = 'idle'
      return
    }
    codeSnippets.value = data
    codeSnippetState.value = 'idle'
  }
  onMounted(loadCodeSnippets)
  watch(() => toValue(search), loadCodeSnippets)

  const moreCodeSnippetsAvailable = computed(() => !!codeSnippets.value.nextCursor)

  const loadMoreCodeSnippets = async () => {
    if (codeSnippetState.value !== 'idle' || !codeSnippets.value.nextCursor) {
      return
    }
    codeSnippetState.value = 'loadingMore'
    const nextCursor = codeSnippets.value.nextCursor
    const { data, error } = await safe(client.codeSnippet.list({
      search: toValue(search),
      cursor: nextCursor,
    }))
    if (error) {
      toast.error(error?.message || String(error))
      codeSnippetState.value = 'idle'
      return
    }
    codeSnippets.value = {
      data: [...codeSnippets.value.data, ...data.data],
      nextCursor: data.nextCursor,
    }
    codeSnippetState.value = 'idle'
  }

  async function createCodeSnippet(payload: ApiRouteInput['codeSnippet']['create']) {
    if (codeSnippetState.value !== 'idle') {
      return
    }
    codeSnippetState.value = 'pending'
    const { data, error } = await safe(client.codeSnippet.create(payload))
    if (error) {
      toast.error(error?.message || String(error))
      codeSnippetState.value = 'idle'
      return
    }

    codeSnippets.value = {
      data: [data, ...codeSnippets.value.data],
      nextCursor: codeSnippets.value.nextCursor,
    }
    codeSnippetState.value = 'idle'
    return data
  }

  async function updateCodeSnippet(id: string, payload: Omit<ApiRouteInput['codeSnippet']['update'], 'id'>) {
    if (codeSnippetState.value !== 'idle') {
      return
    }
    codeSnippetState.value = 'pending'
    const { data, error } = await safe(client.codeSnippet.update({ id, ...payload }))
    if (error) {
      toast.error(error?.message || String(error))
      codeSnippetState.value = 'idle'
      return
    }

    codeSnippets.value = {
      data: codeSnippets.value.data.map(codeSnippet => codeSnippet.id === id ? data : codeSnippet),
      nextCursor: codeSnippets.value.nextCursor,
    }
    codeSnippetState.value = 'idle'
    return data
  }

  async function deleteCodeSnippet(id: string) {
    if (codeSnippetState.value !== 'idle') {
      return
    }
    codeSnippetState.value = 'pending'
    const { error } = await safe(client.codeSnippet.delete({ id }))
    if (error) {
      toast.error(error?.message || String(error))
      codeSnippetState.value = 'idle'
      return
    }

    codeSnippets.value = {
      data: codeSnippets.value.data.filter(codeSnippet => codeSnippet.id !== id),
      nextCursor: codeSnippets.value.nextCursor,
    }
    codeSnippetState.value = 'idle'
    return { id }
  }

  return {
    codeSnippetState,
    codeSnippets,
    loadCodeSnippets,
    loadMoreCodeSnippets,
    moreCodeSnippetsAvailable,
    createCodeSnippet,
    updateCodeSnippet,
    deleteCodeSnippet,
  }
}
