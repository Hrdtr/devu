<script setup lang="ts">
// import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ApiRouteOutput } from '@/composables/use-api'
import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@/components/responsive-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  sidebarMenuButtonVariants,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useApi } from '@/composables/use-api'
import { useLLMChat } from '@/composables/use-llm-chat'
import { useUpdater } from '@/composables/use-updater'
import { useElementBounding } from '@vueuse/core'
import { BotMessageSquare, CloudDownload, Edit, EllipsisVertical, LoaderCircle, PencilRuler, Search, SquarePen, Trash, Wrench } from 'lucide-vue-next'
import { ListboxContent/* , ListboxFilter */, ListboxItem, ListboxRoot, ListboxVirtualizer, useFilter, VisuallyHidden } from 'reka-ui'
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'

const route = useRoute()
const router = useRouter()

const search = ref('')
const { contains } = useFilter({ sensitivity: 'base' })

const { client, safe } = useApi()
const utilities = ref<ApiRouteOutput['utilities']['all']>([])
onMounted(async () => {
  const { data, error } = await safe(client.utilities.all())
  if (error) {
    toast.error(error?.message || String(error))
    return
  }
  utilities.value = data
})
const filteredUtilities = computed(() => utilities.value.filter(p => contains(p.name, search.value)))

const { chatState, chats, updateChat, deleteChat, moreChatsAvailable, loadMoreChats } = useLLMChat({ search })

const chatDropdownMenuKey = ref(0)

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
      chatDropdownMenuKey.value++
    })
}

const sidebarHeader = useTemplateRef('sidebarHeaderRef')
const sidebarGroupHeader = useTemplateRef('sidebarGroupHeaderRef')
const { height: sidebarHeaderHeight } = useElementBounding(sidebarHeader)
const { height: sidebarGroupHeaderHeight } = useElementBounding(sidebarGroupHeader)

const menuItemSelected = computed({
  get: () => {
    if (route.path.startsWith('/chats')) {
      return `chat:${route.params.id}`
    }
    else if (route.path.startsWith('/utilities')) {
      return `utility:${route.params.id}`
    }
    return undefined
  },
  set: (value) => {
    if (!value) {
      router.replace('/')
    }
    else {
      const [type, id] = value.split(':')
      if (type === 'chat') {
        router.replace(`/chats/${id}`)
      }
      else if (type === 'utility') {
        router.replace(`/utilities/${id}`)
      }
    }
  },
})

const sidebarGroupLabel = computed(() => {
  if (route.path.startsWith('/utilities')) {
    return 'Utilities'
  }
  else {
    return 'Chats'
  }
})

const { data: updateData, downloadAndInstall, pending: updatePending, relaunch } = useUpdater()
function downloadAndInstallUpdate() {
  if (updatePending.value || !updateData.value)
    return
  downloadAndInstall()
    .then(relaunch)
    .catch(toast.error)
}
</script>

<template>
  <Sidebar class="!border-0 z-10">
    <div id="sidebar-menu-category" data-tauri-drag-region class="w-12 flex flex-col gap-4 shrink-0">
      <div data-tauri-drag-region class="flex-1 pt-[40px] pb-[12px] flex flex-col items-center gap-1 -mr-2">
        <Button
          :variant="route.path === '/' || route.path.startsWith('/chats') ? 'default' : 'ghost'"
          class="size-10 !p-2"
          @click="menuItemSelected = undefined"
        >
          <BotMessageSquare class="size-full" />
        </Button>
        <Button
          :variant="route.path.startsWith('/utilities') ? 'default' : 'ghost'"
          class="size-10 !p-2"
          @click="menuItemSelected = `utility:${utilities[0].id}`"
        >
          <PencilRuler class="size-[90%]" />
        </Button>
      </div>
      <div data-tauri-drag-region class="pb-2 flex flex-col items-center gap-1 -mr-2">
        <Tooltip v-if="updatePending || !!updateData">
          <TooltipTrigger>
            <Button variant="ghost" class="size-10 !p-2" @click="downloadAndInstallUpdate">
              <LoaderCircle v-if="updatePending" class="size-[90%] animate-spin" />
              <CloudDownload v-else class="size-[90%] self-center origin-center" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" :align="!updatePending && !!updateData ? 'end' : 'center'">
            <template v-if="updatePending">
              <p v-if="updateData" class="font-medium">
                Downloading update...
              </p>
              <p v-else class="font-medium">
                Checking for update...
              </p>
            </template>
            <template v-else>
              <p class="font-medium">
                New update available
              </p>
              <p>v1.0.0 &rarr; v1.1.0</p>
              <p class="mt-1">
                Tap to install.
              </p>
            </template>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
    <div id="sidebar-menu-item" data-tauri-drag-region class="flex-1">
      <SidebarHeader ref="sidebarHeaderRef" data-tauri-drag-region class="pt-[40px] pb-[12px]">
        <form class="-mx-2">
          <SidebarGroup class="py-0">
            <SidebarGroupContent class="relative">
              <Label for="search" class="sr-only">
                Search
              </Label>
              <SidebarInput
                id="search"
                v-model="search"
                placeholder="Search..."
                class="pl-8 text-sm"
              />
              <Search
                class="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50"
              />
            </SidebarGroupContent>
          </SidebarGroup>
        </form>
      </SidebarHeader>
      <SidebarContent class="flex flex-row">
        <SidebarGroup class="p-0">
          <div ref="sidebarGroupHeaderRef" class="px-2 flex flex-col">
            <Button
              v-if="route.path === '/' || route.path.startsWith('/chats')"
              variant="ghost"
              size="sm"
              class="w-full !px-2 justify-start font-normal opacity-80 hover:opacity-100 hover:!bg-transparent transition-all group/create-chat"
              :class="route.path === '/chats/new' ? 'opacity-100' : ''"
              @click="menuItemSelected = 'chat:new'"
            >
              <SquarePen class="size-4 mr-1 opacity-65 group-hover/create-chat:opacity-100 transition-opacity" /> New Chat
            </Button>
            <SidebarGroupLabel data-tauri-drag-region>
              {{ sidebarGroupLabel }}
            </SidebarGroupLabel>
          </div>
          <SidebarGroupContent>
            <ListboxRoot v-model="menuItemSelected" selection-behavior="replace">
              <!-- TODO: https://github.com/unovue/reka-ui/issues/1808 -->
              <!-- <ListboxFilter class="hidden" v-model="search" /> -->
              <ListboxContent
                class="px-2 overflow-y-auto"
                :style="{ height: `calc(100dvh - ${sidebarHeaderHeight}px - ${sidebarGroupHeaderHeight}px)` }"
                data-tauri-drag-region
              >
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
                    :value="`chat:${option.id}`"
                    :class="[
                      sidebarMenuButtonVariants(),
                      menuItemSelected === `chat:${option.id}` ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '',
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
                    <DropdownMenu :key="`${chatDropdownMenuKey}:${option.id}`">
                      <DropdownMenuTrigger as-child>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="absolute right-0 top-1/2 -translate-y-1/2 size-8 opacity-0 group-hover/item:opacity-100"
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
                            <ResponsiveDialogContent class="max-h-[80vh] flex flex-col p-0">
                              <ResponsiveDialogHeader class="w-full max-w-lg mx-auto px-5 pt-5">
                                <ResponsiveDialogTitle>Update Chat Title</ResponsiveDialogTitle>
                                <VisuallyHidden>
                                  <ResponsiveDialogDescription>
                                    Fill out the form below to update this chat title.
                                  </ResponsiveDialogDescription>
                                </VisuallyHidden>
                              </ResponsiveDialogHeader>
                              <form
                                class="flex flex-col overflow-y-auto w-full max-w-lg mx-auto px-5 py-4"
                                @submit.prevent="updateChatTitle"
                              >
                                <Label for="title" class="mb-2">New Title</Label>
                                <Input id="title" v-model="newChatTitle" required />
                              </form>
                              <ResponsiveDialogFooter class="w-full max-w-lg mx-auto px-5 pb-5">
                                <ResponsiveDialogClose as-child>
                                  <Button type="button" variant="outline">
                                    Close
                                  </Button>
                                  <Button type="submit" @click="updateChatTitle">
                                    Submit
                                  </Button>
                                </ResponsiveDialogClose>
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
                                    if (route.path === `/chats/${option.id}`) {
                                      menuItemSelected = 'chat:new'
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
                    :value="`chat:${option.id}`"
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
                <ListboxVirtualizer
                  v-if="route.path.startsWith('/utilities')"
                  v-slot="{ option }"
                  :options="filteredUtilities"
                  :text-content="(opt) => opt.name"
                  :overscan="3"
                >
                  <ListboxItem
                    :key="option.id"
                    :value="`utility:${option.id}`"
                    :class="[
                      sidebarMenuButtonVariants(),
                      menuItemSelected === `utility:${option.id}` ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '',
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
              </ListboxContent>
            </ListboxRoot>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </div>
  </Sidebar>
</template>

<style>
div:has(#sidebar-menu-category + #sidebar-menu-item) {
  display: flex;
  flex-direction: row;
}
</style>
