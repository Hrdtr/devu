<script setup lang="ts">
import type { Virtualizer } from '@tanstack/vue-virtual'
import type { ApiRouteOutput } from '@/composables/use-api'
import { useClipboardItems, useLocalStorage, useScroll, watchDebounced } from '@vueuse/core'
import hljs from 'highlight.js'
import { ArrowUp, Check, ChevronDown, Cog, Copy, History, Pencil, RotateCcw, Square, Trash, X } from 'lucide-vue-next'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import { ListboxContent, ListboxItem, ListboxRoot, ListboxVirtualizer } from 'reka-ui'
import { titleCase } from 'scule'
import { nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { LLMChatMessageBranchSelection, LLMChatProfileForm } from '@/components/llm-chat'
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogTrigger } from '@/components/responsive-dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSidebar } from '@/components/ui/sidebar'
import { useApi } from '@/composables/use-api'
import { useLLMChat } from '@/composables/use-llm-chat'
import { useLLMChatMessages } from '@/composables/use-llm-chat-messages'
import { useLLMChatProfile } from '@/composables/use-llm-chat-profile'
import { useLLMChatState } from '@/composables/use-llm-chat-state'
import 'highlight.js/styles/github-dark.css'

marked.setOptions(marked.getDefaults())
marked.use({
  ...markedHighlight({
    emptyLangClass: 'hljs',
    langPrefix: 'hljs language-',
    highlight(code, lang, _info) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext'
      return hljs.highlight(code, { language }).value
    },
  }),
  // Modified from original marked-highlight plugin to show copy action on code blocks
  renderer: {
    code(code: any, infoString: any, escaped: any) {
      // istanbul ignore next
      if (typeof code === 'object') {
        escaped = code.escaped
        infoString = code.lang
        code = code.text
      }
      function getLang(lang: string) {
        return (lang || '').match(/\S*/)![0]
      }
      const lang = getLang(infoString)
      const escapeTest = /[&<>"']/
      const escapeReplace = new RegExp(escapeTest.source, 'g')
      // eslint-disable-next-line regexp/no-unused-capturing-group
      const escapeTestNoEncode = /[<>"']|&(?!(#\d{1,7}|#X[a-f0-9]{1,6}|\w+);)/i
      const escapeReplaceNoEncode = new RegExp(escapeTestNoEncode.source, 'g')
      const escapeReplacements = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;',
      }
      const getEscapeReplacement = (ch: string) => escapeReplacements[ch as keyof typeof escapeReplacements]
      function escape(html: string, encode?: boolean) {
        if (encode) {
          if (escapeTest.test(html)) {
            return html.replace(escapeReplace, getEscapeReplacement)
          }
        }
        else {
          if (escapeTestNoEncode.test(html)) {
            return html.replace(escapeReplaceNoEncode, getEscapeReplacement)
          }
        }

        return html
      }
      const classValue = lang ? `hljs language-${escape(lang)}` : hljs
      const classAttr = classValue
        ? ` class="${classValue}"`
        : ''
      code = code.replace(/\n$/, '')
      const copyButton = document.createElement('button')
      copyButton.classList.add(
        'copy-code',
        'absolute',
        'top-1',
        'right-1',
        'p-2',
        'text-muted-foreground',
        'hover:text-foreground',
        'transition-colors',
      )
      // lucide:copy icon
      copyButton.innerHTML = `<svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`
      return `<pre class="relative border">${copyButton.outerHTML}<code ${classAttr}>${escaped ? code : escape(code, true)}\n</code></pre>`
    },
  } as ReturnType<typeof markedHighlight>['renderer'],
})

const route = useRoute()
const router = useRouter()

const activated = ref(false)
onActivated(() => (activated.value = true))
onDeactivated(() => (activated.value = false))

const { chatId, title, scrollElementRef } = useLLMChatState()

function codeblockCopyEventHandler(e: Event) {
  const target = e.target as HTMLElement
  // Match `.copy-code` anywhere in document
  const button = target.closest('button.copy-code')
  if (!button) {
    return
  }
  // Traverse up to <pre> and get sibling <code>
  const pre = button.closest('pre')
  const code = pre?.querySelector('code')
  if (!code) {
    return
  }

  e.preventDefault()
  e.stopPropagation()
  const codeText = code.textContent || ''
  navigator.clipboard.writeText(codeText).then(() => {
    toast.success('Copied to clipboard!')
  }).catch(() => {
    toast.error('Failed to copy.')
  })
}
onMounted(() => document.addEventListener('click', codeblockCopyEventHandler))
onBeforeUnmount(() => document.removeEventListener('click', codeblockCopyEventHandler))
onActivated(() => document.addEventListener('click', codeblockCopyEventHandler))
onDeactivated(() => document.removeEventListener('click', codeblockCopyEventHandler))

const { copy } = useClipboardItems()
const copiedMessageId = ref<string>()
const copiedMessageIdTimeout = ref<ReturnType<typeof setTimeout>>()
watch(copiedMessageId, (value) => {
  if (!value) {
    return
  }
  if (copiedMessageIdTimeout.value) {
    clearTimeout(copiedMessageIdTimeout.value)
  }
  copiedMessageIdTimeout.value = setTimeout(() => {
    copiedMessageId.value = undefined
    copiedMessageIdTimeout.value = undefined
  }, 1000)
})

function createClipboardItem(type: string, data: any) {
  return new ClipboardItem({ [type]: new Blob([data], { type }) })
}

const chatContainerRef = useTemplateRef('chatContainer')
const formContainerRef = useTemplateRef('formContainer')
const virtualizerRef = ref<Virtualizer<HTMLElement, Element>>()

watch(chatContainerRef, (value) => {
  scrollElementRef.value = value?.$el
}, { immediate: true })

const { client, safe } = useApi()

const { profiles, deleteProfile } = useLLMChatProfile()
const { createChat } = useLLMChat()
const {
  switchToBranch,
  messageState,
  messages,
  // loadMessages,
  loadMoreMessages,
  moreMessagesAvailable,
  sendMessage,
  regenerateMessage,
  editMessage,
  getAvailableBranches,
  stopActiveMessageStream,
} = useLLMChatMessages(() => chatId.value || 'new', {
  onEventReceived: ({ action, data }) => {
    if (action === 'set_chat_title') {
      title.value = data
    }
  },
})

const chat = ref<ApiRouteOutput['llmChat']['retrieve']>()
async function retrieveChat() {
  if (!chatId.value) {
    title.value = 'New Chat'
    return
  }
  const { data, error } = await safe(client.llmChat.retrieve({ id: chatId.value }))
  if (error) {
    toast.error(error.message)
    chatId.value = undefined
    return
  }
  chat.value = data
  title.value = chat.value?.title || 'Untitled'
}
onMounted(retrieveChat)
onActivated(retrieveChat)

const { isScrolling, y: scrollY } = useScroll(() => chatContainerRef.value?.$el, { behavior: 'smooth' })

async function scrollToBottom() {
  requestAnimationFrame(() => {
    virtualizerRef.value?.scrollToIndex(messages.value.data.length - 1, { align: 'start' })
  })
}
onActivated(scrollToBottom)
watch(virtualizerRef, scrollToBottom)

async function switchBranch(parentId: string, branch: string) {
  const parentMessage = messages.value.data.find(m => m.id === parentId)
  if (!parentMessage) {
    return
  }
  await switchToBranch(parentId, branch)
  if (moreMessagesAvailable.value && messages.value.data.length <= 10) {
    await loadMoreMessages()
  }
  requestAnimationFrame(() => {
    const index = messages.value.data.findIndex(m => m.id === parentMessage.id)
    if (index !== -1) {
      virtualizerRef.value?.scrollToIndex(index + 1, { align: 'start' })
    }
  })
}

// Auto scroll on new message created and message content stream received
watch(() => `${messages.value.data[messages.value.data.length - 1]?.content}`, (value) => {
  nextTick(() => {
    const el = chatContainerRef.value?.$el
    if (!el || isScrolling.value) {
      return
    }

    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 60
    if (atBottom || value === '') {
      scrollY.value = el.scrollHeight
    }
  })
})

// Trigger load more on scroll position on top
watchDebounced(scrollY, async (value) => {
  if (!moreMessagesAvailable.value) {
    return
  }
  const atTop = value < 60
  if (atTop) {
    const prevFirstMessage = messages.value.data[0]
    await loadMoreMessages()
    if (prevFirstMessage && prevFirstMessage.id !== messages.value.data[0]?.id && virtualizerRef.value) {
      const index = messages.value.data.findIndex(m => m.id === prevFirstMessage.id)
      requestAnimationFrame(() => {
        virtualizerRef.value?.scrollToIndex(index, { align: 'start' })
      })
    }
  }
}, { immediate: true, debounce: 500 })

const profileSelected = ref<typeof profiles.value[number]>()
const createProfileDialogOpen = ref(false)
const updateProfileDialogOpenForId = ref<string>()

async function initializeProfile() {
  const assistantMessages = messages.value.data.filter(i => i.role === 'assistant')
  const { provider, model } = assistantMessages[assistantMessages.length - 1]?.metadata || {}
  if (provider && model) {
    profileSelected.value = profiles.value.find(p => p.provider === provider && p.model === model)
  }
  else {
    profileSelected.value = profiles.value[0]
  }
}
onActivated(initializeProfile)
watch([profiles, messageState], ([profilesValue, messageStateValue], [prevProfilesValue, prevMessageStateValue]) => {
  if ((messageStateValue === 'idle' && prevMessageStateValue === 'loading') || (profilesValue.length > 0 && prevProfilesValue.length === 0)) {
    initializeProfile()
  }
})

// Handle initial message on new chat creation
const initialChatPayload = useLocalStorage('initialChatPayload', '')
onMounted(async () => {
  if (initialChatPayload.value) {
    const { message, profile: initialChatProfile } = JSON.parse(initialChatPayload.value)
    profileSelected.value = profiles.value.find(p => p.id === initialChatProfile.id)
    await nextTick()
    await sendMessage(message, initialChatProfile)
    initialChatPayload.value = ''
  }
})

const messageContent = ref('')
watch(() => messageState.value === 'streaming', (value) => {
  if (value) {
    messageContent.value = ''
  }
})

const editMessageContent = ref('')
const editMessageId = ref<string>()
watch(editMessageId, (value) => {
  editMessageContent.value = value ? (messages.value.data.find(m => m.id === value)?.content || '') : ''
})

async function submitMessage() {
  if (!profileSelected.value) {
    toast.error('Please select a profile first')
    return
  }
  if (!chatId.value) {
    const newChat = await createChat()
    if (newChat) {
      initialChatPayload.value = JSON.stringify({ message: messageContent.value, profile: profileSelected.value })
      messageContent.value = ''
      chatId.value = newChat.id
    }
  }
  else {
    await sendMessage(messageContent.value, profileSelected.value)
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' && event.shiftKey === false) {
    event.preventDefault()
    submitMessage()
  }
}

function parseAssistantMessageContent(content: string) {
  // Regex to find <think>...</think> or <think>... (unclosed)
  const thinkBlockRegex = /<think>(.*?)<\/think>|<think>(.*)/s
  const match = content.match(thinkBlockRegex)

  let displayContent = content
  let thinkingProcessContent = ''

  let thinkCompleted = true
  if (match) {
    if (match[1] !== undefined) { // If it's a closed tag, take the content from group 1
      thinkCompleted = true
      thinkingProcessContent = match[1]
      displayContent = content.replace(match[0], '') // Remove from main content
    }
    else if (match[2] !== undefined) { // If it's unclosed, take content from group 2
      thinkCompleted = false
      thinkingProcessContent = match[2]
      displayContent = content.replace(match[0], '') // Remove from main content
    }
  }

  // Return both the main content and the thinking process content
  return {
    thinkCompleted,
    think: thinkingProcessContent.trim().length > 0 ? marked.parse(thinkingProcessContent) : null,
    main: marked.parse(displayContent),
  }
}

const { isMobile, openMobile, setOpenMobile } = useSidebar()
</script>

<template>
  <div class="w-full h-full flex flex-col relative">
    <Teleport v-if="activated && route.path !== '/' && !route.path.startsWith('/chats')" to="#chat-header-end">
      <div class="flex flex-row items-center">
        <Button
          variant="ghost"
          size="icon"
          class="w-8 h-8"
          @click="() => {
            if (isMobile && !openMobile) {
              setOpenMobile(true)
            }
            router.replace('/')
          }"
        >
          <History />
          <span class="sr-only">Conversation history</span>
        </Button>
      </div>
    </Teleport>
    <div v-if="!chatId" class="w-full h-full grid place-items-center">
      <div class="text-center p-14 w-full max-w-lg group">
        <div class="flex justify-center isolate">
          <div
            class="size-12 bg-white grid place-items-center ring-1 ring-black/[0.08] rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.57697 14.0171C3.63864 14.899 4.04811 15.7202 4.71532 16.3002C5.38252 16.8802 6.2528 17.1714 7.1347 17.1097L14.6164 16.5866C15.1658 16.5482 15.702 16.4012 16.1943 16.1543C16.6865 15.9073 17.1248 15.5653 17.484 15.1479C17.8432 14.7305 18.1161 14.246 18.2869 13.7225C18.4577 13.199 18.5231 12.6468 18.4792 12.0979C18.4353 11.5489 18.283 11.0141 18.0311 10.5244C17.7793 10.0347 17.4329 9.59979 17.0119 9.24479C16.5909 8.88978 16.1037 8.62175 15.5785 8.45618C15.0533 8.29061 14.5005 8.23079 13.9521 8.28019C13.8088 7.74474 13.5603 7.24324 13.2209 6.80501C12.8816 6.36679 12.4582 6.00065 11.9756 5.72801C11.4931 5.45537 10.9609 5.28172 10.4105 5.2172C9.85995 5.15269 9.30212 5.19861 8.76958 5.35228C8.23705 5.50595 7.74051 5.76429 7.30901 6.11217C6.87752 6.46006 6.51974 6.8905 6.25661 7.37832C5.99348 7.86615 5.83028 8.40155 5.77656 8.9532C5.72284 9.50486 5.77968 10.0617 5.94375 10.5911C5.21902 10.8088 4.58991 11.2666 4.1598 11.8892C3.72968 12.5118 3.52415 13.2622 3.57697 14.0171Z"
                stroke="#666666"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div
            class="size-12 bg-white grid place-items-center ring-1 ring-black/[0.08] rounded-xl z-10 shadow-lg group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200"
          >
            <svg
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 17.5L13 12.5M14.6667 8.33333C14.6667 9.09938 14.5158 9.85792 14.2226 10.5657C13.9295 11.2734 13.4998 11.9164 12.9581 12.4581C12.4164 12.9998 11.7734 13.4295 11.0657 13.7226C10.3579 14.0158 9.59938 14.1667 8.83333 14.1667C8.06729 14.1667 7.30875 14.0158 6.60101 13.7226C5.89328 13.4295 5.25022 12.9998 4.70854 12.4581C4.16687 11.9164 3.73719 11.2734 3.44404 10.5657C3.15088 9.85792 3 9.09938 3 8.33333C3 6.78624 3.61458 5.30251 4.70854 4.20854C5.80251 3.11458 7.28624 2.5 8.83333 2.5C10.3804 2.5 11.8642 3.11458 12.9581 4.20854C14.0521 5.30251 14.6667 6.78624 14.6667 8.33333Z"
                stroke="#666666"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div
            class="size-12 bg-white grid place-items-center ring-1 ring-black/[0.08] rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.3482 7.67475L11.1157 11M10.8832 14.3252L10.8915 14.3258M18.5974 11.5231C18.5287 12.5056 18.2672 13.465 17.8277 14.3464C17.3882 15.2279 16.7795 16.0141 16.0361 16.6603C15.2928 17.3064 14.4295 17.7999 13.4955 18.1124C12.5615 18.4249 11.575 18.5504 10.5925 18.4817C9.61 18.413 8.65064 18.1514 7.76921 17.712C6.88777 17.2725 6.10153 16.6637 5.45537 15.9204C4.80921 15.1771 4.31578 14.3138 4.00326 13.3797C3.69075 12.4457 3.56526 11.4593 3.63396 10.4768C3.77272 8.49251 4.69404 6.64462 6.19525 5.33964C7.69646 4.03466 9.65459 3.37948 11.6389 3.51823C13.6231 3.65698 15.471 4.57831 16.776 6.07952C18.081 7.58073 18.7362 9.53886 18.5974 11.5231Z"
                stroke="#666666"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
        <h2 class="text-base font-medium mt-6">
          Hi, I'm Devu 👋
        </h2>
        <p class="max-w-xs mx-auto text-sm text-muted-foreground mt-2">
          Your development assistant ready to help with
          coding tasks, documentation, and more.
        </p>
        <div class="inline-flex items-center gap-2">
          <Button variant="link" class="p-0 text-foreground/80 font-normal">
            Donate
          </Button>
          <span role="separator">·</span>
          <Button variant="link" class="p-0 text-foreground/80 font-normal">
            Source Code
          </Button>
        </div>
      </div>
    </div>
    <ListboxRoot v-else class="flex-1 h-dvh -mt-[80px]" disabled>
      <ListboxContent
        ref="chatContainer"
        class="w-full h-full overflow-y-auto pt-[80px]"
        :style="{
          paddingBottom: `${(formContainerRef?.offsetHeight || 0)}px`,
        }"
      >
        <ListboxVirtualizer
          v-slot="{ option: message, virtualizer, virtualItem }"
          :options="messages.data"
          :text-content="(opt) => opt.content"
          :overscan="3"
        >
          <div
            :ref="(el) => {
              if (el) {
                virtualizer.measureElement(el as HTMLDivElement)
              }
              if (!virtualizerRef) {
                virtualizerRef = virtualizer
              }
            }"
            class="w-full"
          >
            <ListboxItem :key="message.id" :value="message.id" class="w-full">
              <div v-if="virtualItem.index === 0 && moreMessagesAvailable" class="text-center text-muted-foreground p-4">
                Loading more messages...
              </div>
              <div class="w-full max-w-screen-md mx-auto p-4 mb-4 space-y-2">
                <div
                  v-if="message.role === 'human'"
                  class="px-3 py-2 mb-1 w-fit max-w-[80%] bg-secondary text-secondary-foreground rounded-lg ml-auto text-right transition origin-bottom-right"
                  :class="editMessageId === message.id ? 'opacity-0 scale-80' : 'opacity-100 scale-100'"
                >
                  <div class="select-auto">
                    <p>{{ message.content }}</p>
                  </div>
                </div>
                <div v-else class="mb-1">
                  <div v-if="messageState === 'streaming' && message.content.length === 0" class="flex space-x-0.5 items-center">
                    <span class="sr-only">Loading...</span>
                    <div class="size-1.5 bg-primary rounded-full animate-caret-blink [animation-delay:-0.3s]" />
                    <div class="size-1.5 bg-primary rounded-full animate-caret-blink [animation-delay:-0.15s]" />
                    <div class="size-1.5 bg-primary rounded-full animate-caret-blink" />
                  </div>
                  <template v-else>
                    <details
                      v-if="parseAssistantMessageContent(message.content).think"
                      class="mb-6 open:pb-0 border-b open:border-b-0 [&_svg]:-rotate-90 open:[&_svg]:rotate-0 open:[&_>_summary]:text-foreground [&_>_summary]:list-none [&_>_summary]:[list-style:none] [&_>_summary::-webkit-details-marker]:hidden"
                    >
                      <summary class="flex flex-row items-center justify-between py-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer [&_>_span]:cursor-pointer">
                        <span v-if="!parseAssistantMessageContent(message.content).thinkCompleted" class="animate-pulse">Thinking...</span>
                        <span v-else>Thought process</span>

                        <ChevronDown class="transition w-4 h-4 -mr-1" />
                      </summary>
                      <div
                        :key="`think-${message.id}`"
                        class="prose dark:prose-invert [&_pre:has(code)]:p-0 select-auto mb-6 pt-2 pl-4 border-l opacity-80"
                        v-html="parseAssistantMessageContent(message.content).think"
                      />
                    </details>
                    <div
                      :key="message.id"
                      class="prose dark:prose-invert [&_pre:has(code)]:p-0 select-auto"
                      v-html="parseAssistantMessageContent(message.content).main"
                    />
                  </template>
                </div>
                <!-- <div>{{ message.branch_id }}</div> -->

                <div class="flex flex-row -mx-2 mb-1" :class="message.role === 'human' ? 'justify-end' : ''">
                  <template v-if="message.role === 'human'">
                    <LLMChatMessageBranchSelection
                      :key="message.id"
                      :chat-id="chatId"
                      :message="message"
                      :get-available-branches="getAvailableBranches"
                      :disabled="messageState !== 'idle'"
                      @switch-to-branch="(value) => {
                        if (!message.parentId) return
                        switchBranch(message.parentId, value)
                      }"
                    />

                    <template v-if="virtualItem.index === messages.data.length - 2">
                      <Popover v-if="messageState === 'idle'" :open="editMessageId === message.id">
                        <PopoverTrigger as-child>
                          <Button
                            :variant="editMessageId === message.id ? 'secondary' : 'ghost'"
                            size="icon"
                            class="size-8 !p-0"
                            @click="editMessageId = editMessageId === message.id ? undefined : message.id"
                          >
                            <component :is="editMessageId === message.id ? X : Pencil" class="size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          side="top"
                          align="end"
                          :align-offset="-24"
                          class="bg-secondary text-secondary-foreground p-0 w-[min(32rem,calc(100vw-2rem))]"
                        >
                          <form
                            @submit.prevent="() => {
                              if (!profileSelected) {
                                toast.error('Please select a profile first')
                                return
                              }
                              message.content = editMessageContent
                              editMessageId = undefined
                              editMessage(message.id, message.content, profileSelected)
                                .then(() => (editMessageContent = ''))
                                .catch(toast.error)
                            }"
                          >
                            <textarea
                              v-model="editMessageContent"
                              class="w-full focus:outline-none px-3 pt-3"
                              rows="4"
                              autofocus
                            />
                            <div class="flex flex-row justify-end gap-1 px-3 pb-3">
                              <Button type="button" variant="outline" @click="editMessageId = undefined">
                                Cancel
                              </Button>
                              <Button type="submit">
                                Submit
                              </Button>
                            </div>
                          </form>
                        </PopoverContent>
                      </Popover>
                      <Button
                        v-else
                        variant="ghost"
                        size="icon"
                        class="size-8 !p-0"
                        disabled
                      >
                        <Pencil class="size-4" />
                      </Button>
                    </template>

                    <Button
                      variant="ghost"
                      size="icon"
                      class="size-8 !p-0"
                      :disabled="messageState !== 'idle'"
                      @click="() => {
                        copy([createClipboardItem('text/plain', message.content)])
                          .then(() => (copiedMessageId = message.id))
                          .catch(toast.error)
                      }"
                    >
                      <component
                        :is="copiedMessageId === message.id ? Check : Copy"
                        class="size-4"
                        :class="copiedMessageId === message.id ? 'text-green-500' : ''"
                      />
                    </Button>
                  </template>
                  <template v-else>
                    <Button
                      variant="ghost"
                      size="icon"
                      class="size-8 !p-0"
                      :disabled="messageState !== 'idle'"
                      @click="() => {
                        copy([createClipboardItem('text/plain', message.content)])
                          .then(() => (copiedMessageId = message.id))
                          .catch(toast.error)
                      }"
                    >
                      <component
                        :is="copiedMessageId === message.id ? Check : Copy"
                        class="size-4"
                        :class="copiedMessageId === message.id ? 'text-green-500' : ''"
                      />
                    </Button>

                    <Button
                      v-if="virtualItem.index === messages.data.length - 1"
                      variant="ghost"
                      size="icon"
                      class="size-8 !p-0"
                      :disabled="messageState !== 'idle'"
                      @click="() => {
                        if (!profileSelected) {
                          toast.error('Please select a profile first')
                          return
                        }
                        regenerateMessage(message.id, profileSelected)
                      }"
                    >
                      <RotateCcw class="size-4" />
                    </Button>

                    <LLMChatMessageBranchSelection
                      v-if="messageState === 'idle'"
                      :key="message.id"
                      :chat-id="chatId"
                      :message="message"
                      :get-available-branches="getAvailableBranches"
                      @switch-to-branch="(value) => {
                        if (!message.parentId) return
                        switchBranch(message.parentId, value)
                      }"
                    />
                  </template>
                </div>
                <p class="text-xs text-gray-500" :class="message.role === 'human' ? 'text-right' : ''">
                  {{ titleCase(message.role) }}<span v-if="message.role === 'assistant'" class="font-semibold">&nbsp;({{ message.metadata.provider }}: {{ message.metadata.model }})</span> - {{ new Date(message.createdAt).toLocaleString() }}
                </p>
              </div>
            </ListboxItem>
          </div>
        </ListboxVirtualizer>
      </ListboxContent>
    </ListboxRoot>
    <form
      ref="formContainer"
      class="absolute bottom-0 w-full bg-transparent"
      :disabled="messageState !== 'idle'"
      @submit.prevent="submitMessage"
    >
      <div class="w-full max-w-screen-md mx-auto p-3.5">
        <div class="w-full bg-sidebar text-sidebar-foreground rounded-xl">
          <textarea
            v-model="messageContent"
            class="w-full focus:outline-none px-3 pt-3"
            placeholder="Type your message here..."
            rows="3"
            @keydown="handleKeyDown"
          />
          <div class="px-3 flex flex-row justify-between gap-4 pb-3">
            <div class="flex flex-row gap-1">
              <Select v-model="profileSelected" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a profile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Profiles</SelectLabel>
                    <SelectItem v-for="item in profiles" :key="item.id" :value="item">
                      {{ item.name }}
                    </SelectItem>
                  </SelectGroup>

                  <SelectSeparator />

                  <SelectGroup>
                    <ResponsiveDialog>
                      <ResponsiveDialogTrigger as-child>
                        <SelectItem value="manage" @select.prevent>
                          <Cog /> Manage
                        </SelectItem>
                      </ResponsiveDialogTrigger>
                      <ResponsiveDialogContent class="max-h-[80vh] flex flex-col">
                        <ResponsiveDialogHeader>
                          <ResponsiveDialogTitle>Manage Profiles</ResponsiveDialogTitle>
                          <ResponsiveDialogDescription>
                            Profiles are used to select the appropriate LLM model for chat, along with its specific
                            settings.
                          </ResponsiveDialogDescription>
                        </ResponsiveDialogHeader>

                        <div class="flex flex-col overflow-y-auto py-4">
                          <div
                            v-for="profile in profiles"
                            :key="profile.id"
                            class="flex flex-row justify-between gap-4 pb-3 last:pb-0 mb-3 last:mb-0 border-b last:border-b-0"
                          >
                            <div>
                              <p class="leading-none mb-0.5 line-clamp-1">
                                {{ profile.name }}
                              </p>
                              <p class="text-sm text-muted-foreground line-clamp-1">
                                {{ profile.provider }}, {{ profile.model }}
                              </p>
                            </div>
                            <div class="flex flex-row gap-1">
                              <ResponsiveDialog
                                :open="updateProfileDialogOpenForId === profile.id"
                                @update:open="updateProfileDialogOpenForId = updateProfileDialogOpenForId === profile.id ? undefined : profile.id"
                              >
                                <ResponsiveDialogTrigger as-child>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label="Edit"
                                  >
                                    <Pencil />
                                  </Button>
                                </ResponsiveDialogTrigger>
                                <ResponsiveDialogContent class="max-h-[80vh] flex flex-col">
                                  <ResponsiveDialogHeader>
                                    <ResponsiveDialogTitle>
                                      Update Profile
                                    </ResponsiveDialogTitle>
                                    <ResponsiveDialogDescription>
                                      Fill out the form below to update this profile.
                                    </ResponsiveDialogDescription>
                                  </ResponsiveDialogHeader>

                                  <div class="flex flex-col overflow-y-auto py-4 pb-0">
                                    <LLMChatProfileForm
                                      :update="profile"
                                      class="[&_button[type='submit']]:sticky [&_button[type='submit']]:bottom-0"
                                      @updated="(updatedProfile) => {
                                        if (profileSelected && profileSelected.id === updatedProfile.id) {
                                          profileSelected = updatedProfile
                                        }
                                        updateProfileDialogOpenForId = undefined
                                      }"
                                    />
                                  </div>
                                </ResponsiveDialogContent>
                              </ResponsiveDialog>
                              <AlertDialog>
                                <AlertDialogTrigger as-child>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    aria-label="Delete"
                                  >
                                    <Trash />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this profile. <b>Cannot be undone.</b>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction @click="deleteProfile(profile.id)">
                                      Continue
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>

                        <ResponsiveDialogFooter>
                          <Button
                            type="button"
                            variant="secondary"
                            size="lg"
                            @click="createProfileDialogOpen = true"
                          >
                            Create New Profile
                          </Button>
                        </ResponsiveDialogFooter>

                        <ResponsiveDialog v-model:open="createProfileDialogOpen">
                          <ResponsiveDialogContent class="max-h-[80vh] flex flex-col">
                            <ResponsiveDialogHeader>
                              <ResponsiveDialogTitle>
                                Create New Profile
                              </ResponsiveDialogTitle>
                              <ResponsiveDialogDescription>
                                Fill out the form below to create a new profile.
                              </ResponsiveDialogDescription>
                            </ResponsiveDialogHeader>

                            <div class="flex flex-col overflow-y-auto py-4 pb-0">
                              <LLMChatProfileForm
                                class="[&_button[type='submit']]:sticky [&_button[type='submit']]:bottom-0"
                                @created="createProfileDialogOpen = false"
                              />
                            </div>
                          </ResponsiveDialogContent>
                        </ResponsiveDialog>
                      </ResponsiveDialogContent>
                    </ResponsiveDialog>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div class="flex flex-row gap-1">
              <Button v-if="messageState !== 'streaming'" type="submit" :disabled="messageState !== 'idle' || messageContent.length === 0">
                <ArrowUp /> Send
              </Button>
              <Button v-else type="button" @click="stopActiveMessageStream">
                <Square />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>
