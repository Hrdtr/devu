<script setup lang="ts">
import { CloudDownload, LoaderCircle, Search, Settings, SquarePen } from 'lucide-vue-next'
import { computed, ref, useTemplateRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { SettingsDialog } from '@/components/settings'
import { SidebarMainNavigation, SidebarMainNavigationTab } from '@/components/sidebar'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarRail,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useLLMChatState } from '@/composables/use-llm-chat-state'
import { useSidebarSearchKeyword } from '@/composables/use-sidebar-search-keyword'
import { useUpdater } from '@/composables/use-updater'
import { defineShortcuts } from '@/utils/define-shortcuts'

const route = useRoute()
const router = useRouter()

const search = useSidebarSearchKeyword()

const searchInput = useTemplateRef('searchInputRef')
const sidebarHeader = useTemplateRef('sidebarHeaderRef')
const sidebarGroupHeader = useTemplateRef('sidebarGroupHeaderRef')

defineShortcuts({
  meta_f: () => searchInput.value?.$el?.focus(),
})

const activeView = computed({
  get: () => {
    if (route.path.startsWith('/chats')) {
      return `chat:${route.params.id}`
    }
    else if (route.path.startsWith('/utilities')) {
      return `utility:${route.params.id}`
    }
    else if (route.path.startsWith('/code-snippets')) {
      return `code-snippet:${route.params.id}`
    }
    else if (route.path.startsWith('/code-playgrounds')) {
      return `code-playground:${route.params.id}`
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
      else if (type === 'code-snippet') {
        router.replace(`/code-snippets/${id}`)
      }
      else if (type === 'code-playground') {
        router.replace(`/code-playgrounds/${id}`)
      }
    }
  },
})

const sidebarGroupLabel = computed(() => {
  if (route.path.startsWith('/utilities')) {
    return 'Utilities'
  }
  else if (route.path.startsWith('/code-snippets')) {
    return 'Code Snippets'
  }
  else if (route.path.startsWith('/code-playgrounds')) {
    return 'Code Playgrounds'
  }
  else {
    return 'Chats'
  }
})

const { chatId } = useLLMChatState()

const { data: updateData, downloadAndInstall, pending: updatePending, relaunch } = useUpdater()
function downloadAndInstallUpdate() {
  if (updatePending.value || !updateData.value) {
    return
  }
  downloadAndInstall()
    .then(() => relaunch())
    .catch((error) => {
      console.error('Update failed:', error)
      toast.error(error?.message || 'Update failed. Please try again.')
    })
}

const settingsDialogOpen = ref(false)
</script>

<template>
  <Sidebar class="!border-0 z-10">
    <div id="sidebar-menu-category" data-tauri-drag-region class="w-12 flex flex-col gap-4 shrink-0">
      <SidebarMainNavigationTab v-model:active-view="activeView" />

      <div data-tauri-drag-region class="pb-2 flex flex-col items-center gap-1 -mr-2">
        <Tooltip v-if="updatePending || !!updateData">
          <TooltipTrigger>
            <Button variant="ghost" class="size-10 !p-2 text-muted-foreground" @click="downloadAndInstallUpdate">
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
              <p>v{{ updateData?.currentVersion }} &rarr; v{{ updateData?.version }}</p>
              <p class="mt-1">
                Tap to install.
              </p>
            </template>
          </TooltipContent>
        </Tooltip>

        <SettingsDialog v-model:open="settingsDialogOpen" />
        <Tooltip :delay-duration="300">
          <TooltipTrigger as-child>
            <Button variant="ghost" class="size-10 !p-2 text-muted-foreground" @click="settingsDialogOpen = true">
              <Settings class="size-[90%]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" align="center">
            Preferences
          </TooltipContent>
        </Tooltip>
      </div>
    </div>

    <div id="sidebar-menu-item" data-tauri-drag-region class="flex-1">
      <SidebarHeader ref="sidebarHeaderRef" data-tauri-drag-region class="pt-[28px] pb-[12px]">
        <form class="-mx-2">
          <SidebarGroup class="py-0">
            <SidebarGroupContent class="relative">
              <Label for="search" class="sr-only">
                Search
              </Label>
              <SidebarInput
                id="search"
                ref="searchInputRef"
                v-model="search"
                placeholder="Search..."
                autocorrect="off"
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
              :class="!chatId ? 'opacity-100' : ''"
              @click="chatId = undefined"
            >
              <SquarePen class="size-4 mr-1 opacity-65 group-hover/create-chat:opacity-100 transition-opacity" :class="!chatId ? 'opacity-100' : ''" /> New Chat
            </Button>
            <Button
              v-if="route.path.startsWith('/code-snippets')"
              variant="ghost"
              size="sm"
              class="w-full !px-2 justify-start font-normal opacity-80 hover:opacity-100 hover:!bg-transparent transition-all group/create-chat"
              :class="route.path === '/code-snippets/new' ? 'opacity-100' : ''"
              @click="activeView = 'code-snippet:new'"
            >
              <SquarePen class="size-4 mr-1 opacity-65 group-hover/create-chat:opacity-100 transition-opacity" :class="route.path === '/code-snippets/new' ? 'opacity-100' : ''" /> New Code Snippet
            </Button>
            <SidebarGroupLabel data-tauri-drag-region>
              {{ sidebarGroupLabel }}
            </SidebarGroupLabel>
          </div>
          <SidebarGroupContent>
            <SidebarMainNavigation
              v-model:active-view="activeView"
              :sidebar-header-ref="(sidebarHeader as any)"
              :sidebar-group-header-ref="sidebarGroupHeader"
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail class="opacity-0" />
    </div>
  </Sidebar>
</template>

<style>
div:has(#sidebar-menu-category + #sidebar-menu-item) {
  display: flex;
  flex-direction: row;
}
</style>
