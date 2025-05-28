<script setup lang="ts">
import type { MaybeComputedElementRef } from '@vueuse/core'
import { unrefElement, useElementBounding } from '@vueuse/core'
import { Edit, EllipsisVertical, Trash, Wrench } from 'lucide-vue-next'
import { ListboxContent, ListboxItem, ListboxRoot, ListboxVirtualizer, VisuallyHidden } from 'reka-ui'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogTrigger } from '@/components/responsive-dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCodePlayground } from '@/composables/use-code-playground'
import { useCodeSnippet } from '@/composables/use-code-snippet'
import { useLLMChat } from '@/composables/use-llm-chat'
import { useLLMChatState } from '@/composables/use-llm-chat-state'
import { useSidebarSearchKeyword } from '@/composables/use-sidebar-search-keyword'
import { useUtility } from '@/composables/use-utilities'
import { sidebarMenuButtonVariants } from '../ui/sidebar/index'

const props = defineProps<{
  sidebarHeaderRef: MaybeComputedElementRef<HTMLElement | null | undefined>
  sidebarGroupHeaderRef: MaybeComputedElementRef<HTMLElement | null | undefined>
}>()
const activeView = defineModel<string | undefined>('active-view', { required: true })
const route = useRoute()
const search = useSidebarSearchKeyword()
const dropdownMenuKey = ref(0)

const { chatId } = useLLMChatState()
const { chats, moreChatsAvailable, loadMoreChats, chatState, deleteChat, updateChat } = useLLMChat({ search })
const newChatTitle = ref('')
const updateChatTitleId = ref<string>()
function updateChatTitle() {
  if (!updateChatTitleId.value || !newChatTitle.value) {
    return
  }
  const chat = chats.value.data.find(p => p.id === updateChatTitleId.value)
  if (!chat) {
    return
  }

  return updateChat(updateChatTitleId.value, { title: newChatTitle.value })
    .then(() => {
      newChatTitle.value = ''
      updateChatTitleId.value = undefined
      dropdownMenuKey.value++
    })
}

const { utilities } = useUtility({ search })
const { codeSnippets } = useCodeSnippet({ search })
const { codePlaygrounds } = useCodePlayground({ search })

const { height: sidebarHeaderHeight } = useElementBounding(() => unrefElement(props.sidebarHeaderRef))
const { height: sidebarGroupHeaderHeight } = useElementBounding(() => unrefElement(props.sidebarGroupHeaderRef))
</script>

<template>
  <ListboxRoot v-if="route.path === '/' || route.path.startsWith('/chats')" v-model="chatId" selection-behavior="replace">
    <!-- TODO: https://github.com/unovue/reka-ui/issues/1808 -->
    <!-- <ListboxFilter class="hidden" v-model="search" /> -->
    <ListboxContent
      class="px-2 overflow-y-auto"
      :style="{ height: `calc(100dvh - ${sidebarHeaderHeight}px - ${sidebarGroupHeaderHeight}px)` }"
      data-tauri-drag-region
    >
      <!-- Chats -->
      <ListboxVirtualizer
        v-if="route.path === '/' || route.path.startsWith('/chats')"
        v-slot="{ option }"
        :options="moreChatsAvailable
          ? [...chats.data, { id: 'load-more-trigger', createdAt: new Date(), title: 'Load more chats...' }]
          : chats.data"
        :text-content="(opt) => opt.title || 'Untitled'"
        :overscan="3"
      >
        <ListboxItem
          v-if="option.id !== 'load-more-trigger'"
          :key="option.id"
          :value="option.id"
          :class="[
            sidebarMenuButtonVariants(),
            chatId === option.id ? '!bg-primary/5 !text-primary' : '',
          ]"
          class="relative w-full cursor-default group/item !p-0 data-[highlighted]:bg-sidebar-accent/50 data-[highlighted]:text-sidebar-accent-foreground data-[highlighted]:[&_button]:opacity-100 data-[state=checked]:bg-sidebar-accent data-[state=checked]:text-sidebar-accent-foreground data-[state=checked]:[&_button]:opacity-100"
        >
          <Tooltip :delay-duration="300">
            <TooltipTrigger as="div" class="w-full truncate p-2 pr-7">
              <span>{{ option.title || 'Untitled' }}</span>
            </TooltipTrigger>
            <TooltipContent side="right" align="start">
              <p class="font-medium">
                {{ option.title || 'Untitled' }}
              </p>
              <p class="opacity-80">
                {{ option.createdAt.toLocaleString() }}
              </p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenu :key="`${dropdownMenuKey}:${option.id}`">
            <DropdownMenuTrigger as-child>
              <Button
                variant="ghost"
                size="icon"
                class="absolute right-0 top-1/2 -translate-y-1/2 size-8 opacity-0 group-hover/item:opacity-100 data-[state=open]:opacity-100 text-sidebar-foreground"
                @click.stop
              >
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuGroup>
                <ResponsiveDialog
                  :open="updateChatTitleId === option.id"
                  @update:open="updateChatTitleId = updateChatTitleId === option.id ? undefined : option.id"
                >
                  <ResponsiveDialogTrigger as-child>
                    <DropdownMenuItem
                      @select="(e) => {
                        newChatTitle = option.title || ''
                        e.preventDefault()
                      }"
                    >
                      <span>Update Chat Title</span>
                      <Edit class="ml-auto" />
                    </DropdownMenuItem>
                  </ResponsiveDialogTrigger>
                  <ResponsiveDialogContent class="max-h-[80vh] flex flex-col">
                    <ResponsiveDialogHeader>
                      <ResponsiveDialogTitle>Update Chat Title</ResponsiveDialogTitle>
                      <VisuallyHidden>
                        <ResponsiveDialogDescription>
                          Fill out the form below to update this chat title.
                        </ResponsiveDialogDescription>
                      </VisuallyHidden>
                    </ResponsiveDialogHeader>
                    <form
                      class="flex flex-col overflow-y-auto py-4"
                      @submit.prevent="updateChatTitle"
                    >
                      <Label for="title" class="mb-2">New Title</Label>
                      <Input id="title" v-model="newChatTitle" required />
                    </form>
                    <ResponsiveDialogFooter>
                      <Button type="submit" @click="updateChatTitle">
                        Submit
                      </Button>
                    </ResponsiveDialogFooter>
                  </ResponsiveDialogContent>
                </ResponsiveDialog>
                <AlertDialog>
                  <AlertDialogTrigger as-child>
                    <DropdownMenuItem variant="destructive" @select="(e) => e.preventDefault()">
                      <span>Delete</span>
                      <Trash class="ml-auto" />
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this conversation. <b>Cannot be undone.</b>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        @click="deleteChat(option.id).then(async () => {
                          if (chatId === option.id) {
                            chatId = undefined
                          }
                        })"
                      >
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </ListboxItem>
        <ListboxItem
          v-else
          key="load-more-trigger"
          :value="option.id"
          :disabled="chatState === 'loadingMore'"
          :class="sidebarMenuButtonVariants()"
          class="relative w-full cursor-default group/item text-muted-foreground hover:text-muted-foreground data-[highlighted]:bg-sidebar-accent/50 data-[highlighted]:text-sidebar-accent-foreground data-[highlighted]:[&_button]:opacity-100 data-[state=checked]:bg-sidebar-accent data-[state=checked]:text-sidebar-accent-foreground data-[state=checked]:[&_button]:opacity-100"
          @select="(event) => {
            event.preventDefault()
            event.stopPropagation()
            loadMoreChats()
          }"
        >
          {{ option.title }}
        </ListboxItem>
      </ListboxVirtualizer>
    </ListboxContent>
  </ListboxRoot>

  <ListboxRoot v-else v-model="activeView" selection-behavior="replace">
    <!-- TODO: https://github.com/unovue/reka-ui/issues/1808 -->
    <!-- <ListboxFilter class="hidden" v-model="search" /> -->
    <ListboxContent
      class="px-2 overflow-y-auto"
      :style="{ height: `calc(100dvh - ${sidebarHeaderHeight}px - ${sidebarGroupHeaderHeight}px)` }"
      data-tauri-drag-region
    >
      <!-- Utilities -->
      <ListboxVirtualizer
        v-if="route.path.startsWith('/utilities')"
        v-slot="{ option }"
        :options="utilities"
        :text-content="(opt) => opt.name"
        :overscan="3"
      >
        <ListboxItem
          :key="option.id"
          :value="`utility:${option.id}`"
          :class="[
            sidebarMenuButtonVariants(),
            activeView === `utility:${option.id}` ? '!bg-primary/5 !text-primary' : '',
          ]"
          class="relative w-full cursor-default group/item !p-0 data-[highlighted]:bg-sidebar-accent data-[highlighted]:text-sidebar-accent-foreground data-[highlighted]:[&_button]:opacity-100 data-[state=checked]:bg-sidebar-accent data-[state=checked]:text-sidebar-accent-foreground data-[state=checked]:[&_button]:opacity-100"
        >
          <Tooltip :delay-duration="300">
            <TooltipTrigger as="div" class="flex w-full items-center gap-2 overflow-hidden rounded-md p-2">
              <component :is="option.icon || Wrench" class="size-4 shrink-0" />
              <span class="truncate">{{ option.name }}</span>
            </TooltipTrigger>
            <TooltipContent side="right" align="start">
              <p class="font-medium">
                {{ option.name }}
              </p>
              <p class="opacity-80">
                {{ option.description }}
              </p>
            </TooltipContent>
          </Tooltip>
        </ListboxItem>
      </ListboxVirtualizer>

      <!-- Snippets -->
      <ListboxVirtualizer
        v-if="route.path.startsWith('/snippet')"
        v-slot="{ option }"
        :options="codeSnippets.data"
        :text-content="(opt) => opt.name"
        :overscan="3"
      >
        <ListboxItem
          :key="option.id"
          :value="`snippet:${option.id}`"
          :class="[
            sidebarMenuButtonVariants(),
            activeView === `snippet:${option.id}` ? '!bg-primary/5 !text-primary' : '',
          ]"
          class="relative w-full cursor-default group/item !p-0 data-[highlighted]:bg-sidebar-accent data-[highlighted]:text-sidebar-accent-foreground data-[highlighted]:[&_button]:opacity-100 data-[state=checked]:bg-sidebar-accent data-[state=checked]:text-sidebar-accent-foreground data-[state=checked]:[&_button]:opacity-100"
        >
          <Tooltip :delay-duration="300">
            <TooltipTrigger as="div" class="flex w-full items-center gap-2 overflow-hidden rounded-md p-2">
              <span class="truncate">{{ option.name }}</span>
            </TooltipTrigger>
            <TooltipContent side="right" align="start">
              <p class="font-medium">
                {{ option.name }} snippet
              </p>
              <!-- <p class="opacity-80">
                {{ option.description }}
              </p> -->
            </TooltipContent>
          </Tooltip>
        </ListboxItem>
      </ListboxVirtualizer>

      <!-- Playgrounds -->
      <ListboxVirtualizer
        v-if="route.path.startsWith('/playground')"
        v-slot="{ option }"
        :options="codePlaygrounds"
        :text-content="(opt) => opt.name"
        :overscan="3"
      >
        <ListboxItem
          :key="option.id"
          :value="`playground:${option.id}`"
          :class="[
            sidebarMenuButtonVariants(),
            activeView === `playground:${option.id}` ? '!bg-primary/5 !text-primary' : '',
          ]"
          class="relative w-full cursor-default group/item !p-0 data-[highlighted]:bg-sidebar-accent data-[highlighted]:text-sidebar-accent-foreground data-[highlighted]:[&_button]:opacity-100 data-[state=checked]:bg-sidebar-accent data-[state=checked]:text-sidebar-accent-foreground data-[state=checked]:[&_button]:opacity-100"
        >
          <Tooltip :delay-duration="300">
            <TooltipTrigger as="div" class="flex w-full items-center gap-2 overflow-hidden rounded-md p-2">
              <span class="truncate">{{ option.name }}</span>
            </TooltipTrigger>
            <TooltipContent side="right" align="start">
              <p class="font-medium">
                {{ option.name }} playground
              </p>
              <!-- <p class="opacity-80">
                {{ option.description }}
              </p> -->
            </TooltipContent>
          </Tooltip>
        </ListboxItem>
      </ListboxVirtualizer>
    </ListboxContent>
  </ListboxRoot>
</template>
