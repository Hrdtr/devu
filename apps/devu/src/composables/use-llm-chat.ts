import type { MaybeRefOrGetter } from 'vue'
import type { ApiRouteInput, ApiRouteOutput } from './use-api'
import { createGlobalState } from '@vueuse/core'
import { computed, onMounted, ref, toValue, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from './use-api'

export const useLLMChatData = createGlobalState(() => {
  const chatState = ref<'idle' | 'loading' | 'loadingMore' | 'pending'>('idle')
  const chats = ref<ApiRouteOutput['llmChat']['list']>({
    data: [],
    nextCursor: null,
  })

  return { chatState, chats }
})

export function useLLMChat({ search }: { search?: MaybeRefOrGetter<string> } = {}) {
  const { client, safe } = useApi()
  const { chatState, chats } = useLLMChatData()

  const loadChats = async () => {
    if (chatState.value !== 'idle') {
      return
    }
    chatState.value = 'loading'
    const { data, error } = await safe(client.llmChat.list({
      search: toValue(search),
    }))
    if (error) {
      toast.error(error?.message || String(error))
      chatState.value = 'idle'
      return
    }
    chats.value = data
    chatState.value = 'idle'
  }
  onMounted(loadChats)
  watch(() => toValue(search), loadChats)

  const moreChatsAvailable = computed(() => !!chats.value.nextCursor)

  const loadMoreChats = async () => {
    if (chatState.value !== 'idle' || !chats.value.nextCursor) {
      return
    }
    chatState.value = 'loadingMore'
    const nextCursor = chats.value.nextCursor
    const { data, error } = await safe(client.llmChat.list({
      search: toValue(search),
      cursor: nextCursor,
    }))
    if (error) {
      toast.error(error?.message || String(error))
      chatState.value = 'idle'
      return
    }
    chats.value = {
      data: [...chats.value.data, ...data.data],
      nextCursor: data.nextCursor,
    }
    chatState.value = 'idle'
  }

  async function createChat() {
    if (chatState.value !== 'idle') {
      return
    }
    chatState.value = 'pending'
    const { data, error } = await safe(client.llmChat.create())
    if (error) {
      toast.error(error?.message || String(error))
      chatState.value = 'idle'
      return
    }

    chats.value = {
      data: [data, ...chats.value.data],
      nextCursor: chats.value.nextCursor,
    }
    chatState.value = 'idle'
    return data
  }

  async function updateChat(id: string, payload: Omit<ApiRouteInput['llmChat']['update'], 'id'>) {
    if (chatState.value !== 'idle') {
      return
    }
    chatState.value = 'pending'
    const { data, error } = await safe(client.llmChat.update({ id, ...payload }))
    if (error) {
      toast.error(error?.message || String(error))
      chatState.value = 'idle'
      return
    }

    chats.value = {
      data: chats.value.data.map(chat => chat.id === id ? data : chat),
      nextCursor: chats.value.nextCursor,
    }
    chatState.value = 'idle'
    return data
  }

  async function deleteChat(id: string) {
    if (chatState.value !== 'idle') {
      return
    }
    chatState.value = 'pending'
    const { error } = await safe(client.llmChat.delete({ id }))
    if (error) {
      toast.error(error?.message || String(error))
      chatState.value = 'idle'
      return
    }

    chats.value = {
      data: chats.value.data.filter(chat => chat.id !== id),
      nextCursor: chats.value.nextCursor,
    }
    chatState.value = 'idle'
    return { id }
  }

  return {
    chatState,
    chats,
    loadChats,
    loadMoreChats,
    moreChatsAvailable,
    createChat,
    updateChat,
    deleteChat,
  }
}
