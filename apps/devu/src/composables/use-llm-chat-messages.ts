import type { MaybeRefOrGetter } from 'vue'
import type { ApiRouteOutput } from './use-api'
import { useLocalStorage } from '@vueuse/core'
import { computed, onMounted, readonly, ref, toValue, watch } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from './use-api'
import { useLLMChat } from './use-llm-chat'

type AsyncYielded<T> = T extends AsyncIterable<infer U> ? U : never
export function useLLMChatMessages(
  chatId: MaybeRefOrGetter<string>,
  {
    onEventReceived,
  }: {
    onEventReceived?: (event: AsyncYielded<ApiRouteOutput['llmChat']['message']['create'] | ApiRouteOutput['llmChat']['message']['regenerate'] | ApiRouteOutput['llmChat']['message']['update']>) => void
  } = {},
) {
  const { client, safe } = useApi()
  const { updateChat } = useLLMChat()

  const branch = ref<string | null>(null)
  const activeStreamMessageId = ref<string | null>(null)
  const messageState = ref<'idle' | 'loading' | 'loadingMore' | 'pending' | 'streaming'>('idle')

  const messages = ref<ApiRouteOutput['llmChat']['message']['list']>({
    data: [],
    activeBranches: [],
    nextCursor: null,
  })

  watch(() => [...messages.value.activeBranches], (value) => {
    if (messageState.value !== 'idle') {
      return
    }
    updateChat(toValue(chatId), { activeBranches: value })
  }, { deep: true })

  const loadMessages = async (untilId?: number | string) => {
    if (messageState.value !== 'idle') {
      return
    }
    messageState.value = 'loading'
    const { data, error } = await safe(client.llmChat.message.list({
      chatId: toValue(chatId),
      branch: branch.value,
      limit: typeof untilId === 'number' ? untilId : undefined,
      untilId: typeof untilId === 'string' ? untilId : undefined,
    }))
    if (error) {
      toast.error(error?.message || String(error))
      messageState.value = 'idle'
      return
    }
    messages.value = data
    messageState.value = 'idle'
  }

  const switchToBranch = (parentId: string, newBranch: string) => {
    branch.value = newBranch
    const parent = messages.value.data.find(m => m.id === parentId)
    if (parent) {
      return loadMessages(parent.id)
    }
    return loadMessages()
  }

  const moreMessagesAvailable = computed(() => !!messages.value.nextCursor)

  const loadMoreMessages = async () => {
    if (messageState.value !== 'idle' || !messages.value.nextCursor) {
      return
    }
    messageState.value = 'loadingMore'
    const nextCursor = messages.value.nextCursor
    const { data, error } = await safe(client.llmChat.message.list({
      chatId: toValue(chatId),
      branch: branch.value,
      cursor: nextCursor,
    }))
    if (error) {
      toast.error(error?.message || error)
      messageState.value = 'idle'
      return
    }
    messages.value = {
      data: [...data.data, ...messages.value.data],
      activeBranches: messages.value.activeBranches,
      nextCursor: data.nextCursor,
    }
    messageState.value = 'idle'
  }

  async function getAvailableBranches(parentId: string): Promise<string[]> {
    const { data, error } = await safe(client.llmChat.message.branches({ id: parentId }))
    if (error) {
      console.error('Error getting available branches:', error)
      return []
    }
    return data
  }

  const stopStreamRequested = ref(false) // Flag to signal stream stop
  watch(stopStreamRequested, (value) => {
    if (value) {
      setTimeout(() => {
        stopStreamRequested.value = false
      }, 1000)
    }
  })

  async function sendMessage(content: string, profile: ApiRouteOutput['llmChat']['profile']['list']['data'][number]) {
    if (messageState.value !== 'idle') {
      return
    }
    messageState.value = 'streaming'

    const abortController = new AbortController()
    const response = await client.llmChat.message.create({
      chatId: toValue(chatId),
      content,
      profileId: profile.id,
      parentId: messages.value.data[messages.value.data.length - 1]?.id || null,
    }, {
      signal: abortController.signal,
    })

    try {
      for await (const event of response) {
        if (stopStreamRequested.value) {
          abortController.abort()
          if (activeStreamMessageId.value) {
            await client.llmChat.message.abortGeneration({ id: activeStreamMessageId.value })
            activeStreamMessageId.value = null
          }
          break
        }
        else {
          onEventReceived?.(event)
          if (event.action === 'push_message') {
            messages.value = {
              data: [...messages.value.data, event.data],
              activeBranches: messages.value.activeBranches,
              nextCursor: messages.value.nextCursor,
            }
          }
          else if (event.action === 'append_message_content_chunk') {
            activeStreamMessageId.value = event.data.messageId
            messages.value = {
              data: messages.value.data.map(message => message.id === event.data.messageId
                ? { ...message, content: message.content + event.data.chunk }
                : message),
              activeBranches: messages.value.activeBranches,
              nextCursor: messages.value.nextCursor,
            }
          }
          else if (event.action === 'set_chat_title') {
            await updateChat(toValue(chatId), { title: event.data })
          }
        }
      }
      activeStreamMessageId.value = null
      messageState.value = 'idle'
    }
    catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      toast.error(error instanceof Error ? error.message : String(error))
      messageState.value = 'idle'
    }
  }

  async function regenerateMessage(id: string, profile: ApiRouteOutput['llmChat']['profile']['list']['data'][number]) {
    if (messageState.value !== 'idle') {
      return
    }
    messageState.value = 'streaming'
    const abortController = new AbortController()
    const response = await client.llmChat.message.regenerate({
      id,
      profileId: profile.id,
    }, {
      signal: abortController.signal,
    })

    try {
      for await (const event of response) {
        if (stopStreamRequested.value) {
          abortController.abort()
          if (activeStreamMessageId.value) {
            await client.llmChat.message.abortGeneration({ id: activeStreamMessageId.value })
            activeStreamMessageId.value = null
          }
          break
        }
        else {
          onEventReceived?.(event)
          if (event.action === 'truncate_messages_after') {
            messages.value = {
              data: messages.value.data.slice(0, messages.value.data.findIndex(message => message.id === event.data) + 1),
              activeBranches: messages.value.activeBranches,
              nextCursor: messages.value.nextCursor,
            }
          }
          else if (event.action === 'push_message') {
            messages.value = {
              data: [...messages.value.data, event.data],
              activeBranches: messages.value.activeBranches,
              nextCursor: messages.value.nextCursor,
            }
          }
          else if (event.action === 'append_message_content_chunk') {
            activeStreamMessageId.value = event.data.messageId
            messages.value = {
              data: messages.value.data.map(message => message.id === event.data.messageId
                ? { ...message, content: message.content + event.data.chunk }
                : message),
              activeBranches: messages.value.activeBranches,
              nextCursor: messages.value.nextCursor,
            }
          }
          else if (event.action === 'switch_to_branch') {
            branch.value = event.data
          }
        }
      }
      activeStreamMessageId.value = null
      messageState.value = 'idle'
    }
    catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      toast.error(error instanceof Error ? error.message : String(error))
      messageState.value = 'idle'
    }
  }

  async function editMessage(id: string, content: string, profile: ApiRouteOutput['llmChat']['profile']['list']['data'][number]) {
    if (messageState.value !== 'idle') {
      return
    }
    messageState.value = 'streaming'
    const abortController = new AbortController()
    const response = await client.llmChat.message.update({
      id,
      content,
      profileId: profile.id,
    }, {
      signal: abortController.signal,
    })

    try {
      for await (const event of response) {
        if (stopStreamRequested.value) {
          abortController.abort()
          if (activeStreamMessageId.value) {
            await client.llmChat.message.abortGeneration({ id: activeStreamMessageId.value })
            activeStreamMessageId.value = null
          }
          break
        }
        else {
          onEventReceived?.(event)
          if (event.action === 'truncate_messages_since') {
            messages.value = {
              data: messages.value.data.slice(0, messages.value.data.findIndex(message => message.id === event.data)),
              activeBranches: messages.value.activeBranches,
              nextCursor: messages.value.nextCursor,
            }
          }
          else if (event.action === 'push_message') {
            messages.value = {
              data: [...messages.value.data, event.data],
              activeBranches: messages.value.activeBranches,
              nextCursor: messages.value.nextCursor,
            }
          }
          else if (event.action === 'append_message_content_chunk') {
            activeStreamMessageId.value = event.data.messageId
            messages.value = {
              data: messages.value.data.map(message => message.id === event.data.messageId
                ? { ...message, content: message.content + event.data.chunk }
                : message),
              activeBranches: messages.value.activeBranches,
              nextCursor: messages.value.nextCursor,
            }
          }
          else if (event.action === 'switch_to_branch') {
            branch.value = event.data
          }
        }
      }
      activeStreamMessageId.value = null
      messageState.value = 'idle'
    }
    catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      toast.error(error instanceof Error ? error.message : String(error))
      messageState.value = 'idle'
    }
  }

  function stopActiveMessageStream() {
    if (messageState.value === 'streaming' && !stopStreamRequested.value) {
      stopStreamRequested.value = true
      // The streaming loop's check will handle appending text, saving, and resetting state.
    }
  }

  const initialChatPayload = useLocalStorage('initialChatPayload', '')
  onMounted(async () => {
    // Prevent refresh the reactive messages array on initial chat
    if (!initialChatPayload.value && toValue(chatId) !== 'new') {
      const { data, error } = await safe(client.llmChat.retrieve({ id: toValue(chatId) }))
      if (error) {
        toast.error(error?.message || String(error))
        return
      }
      if (data.activeBranches && data.activeBranches.length > 0) {
        branch.value = data.activeBranches[0]
        await loadMessages()
        return
      }
      await loadMessages()
    }
  })

  return {
    branch: readonly(branch),
    switchToBranch,
    messageState,
    messages,
    loadMessages,
    loadMoreMessages,
    moreMessagesAvailable,
    sendMessage,
    regenerateMessage,
    editMessage,
    getAvailableBranches,
    stopActiveMessageStream,
  }
}
