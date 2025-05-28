<script setup lang="ts">
import { app } from '@tauri-apps/api'
import { debouncedRef, useColorMode, useCssVar, useScroll } from '@vueuse/core'
import { ChevronRight, MessageCircle } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { AppSidebar } from '@/components/app-sidebar'
import { LLMChatView } from '@/components/llm-chat'
import { RootProvider } from '@/components/root-provider'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Separator } from '@/components/ui/separator'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { useLLMChatState } from '@/composables/use-llm-chat-state'
import { useMainElementRef } from '@/composables/use-main-element-ref'
import { usePageMeta } from '@/composables/use-page-meta'
import { useSettingsAppearance } from './composables/use-settings-appearance'

const route = useRoute()

const { title: $title } = usePageMeta()
const title = debouncedRef($title, 200)

const { store, system } = useColorMode()
const isDarkMode = computed(() => (store.value === 'auto' ? system.value : store.value) === 'dark')
watch(isDarkMode, async (value) => {
  await app.setTheme(value ? 'dark' : 'light')
  requestAnimationFrame(() => {
    document.documentElement.dataset.theme = value ? 'dark' : 'light'
    document.documentElement.classList[value ? 'add' : 'remove']('dark')
    document.documentElement.classList[value ? 'remove' : 'add']('light')
  })
}, { immediate: true })

const { scale, motion } = useSettingsAppearance()
const cssVar = useCssVar('--root-font-size', document.documentElement, { initialValue: '14px' })
watch(scale, (value) => {
  requestAnimationFrame(() => {
    cssVar.value = `${(value * 14)}px`
  })
}, { immediate: true })
watch(motion, (value) => {
  document.documentElement.dataset.motion = value
  const shouldReduce
    = motion.value === 'reduced' || (motion.value === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  requestAnimationFrame(() => {
    document.documentElement.classList.toggle('motion-disabled', shouldReduce)
  })
}, { immediate: true })

const sidebarExpanded = ref<boolean>()
const mainElementRef = useMainElementRef()
const { y: mainScrollY } = useScroll(mainElementRef)

const { chatId, title: chatTitle, scrollElementRef: chatScrollElementRef } = useLLMChatState()
const chatViewVisible = ref(true)
watch(() => route.path, (value) => {
  if (value === '/') {
    chatViewVisible.value = true
  }
})
const { y: chatScrollY } = useScroll(chatScrollElementRef)
</script>

<template>
  <Suspense>
    <RootProvider>
      <SidebarProvider v-model:open="sidebarExpanded">
        <AppSidebar />

        <div class="w-full">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel v-show="route.path !== '/'" :default-size="50">
              <div>
                <header
                  data-tauri-drag-region
                  class="sticky h-[64px] px-4 pt-[28px] backdrop-blur-lg z-10 transition-colors duration-300"
                  :class="mainScrollY > 40 ? 'bg-sidebar/90' : 'bg-sidebar/50'"
                >
                  <div class="w-full flex flex-row items-center justify-between gap-4">
                    <div class="w-full flex flex-row items-center gap-2 -ml-2">
                      <SidebarTrigger class="w-8 h-8" />
                      <transition name="page-title" mode="out-in">
                        <div
                          v-if="title"
                          :key="`${route.path}:${title.toLowerCase()}`"
                          class="flex-1 flex flex-row items-center gap-2"
                          data-tauri-drag-region
                        >
                          <Separator orientation="vertical" class="!h-5 mr-1 shrink-0" />
                          <p v-if="title" class="leading-none line-clamp-1">
                            <template v-if="title.includes(':')">
                              <span class="text-muted-foreground">{{ title.split(':')[0].trim() }}:</span> {{ title.split(':')[1].trim() }}
                            </template>
                            <template v-else>
                              {{ title }}
                            </template>
                          </p>
                        </div>
                      </transition>
                      <div id="header-start" />
                    </div>
                    <div class="flex flex-row items-center justify-end" :class="route.path !== '/' && !chatViewVisible ? '-mr-2' : ''">
                      <div id="header-end" />
                      <Button
                        v-if="route.path !== '/' && !chatViewVisible"
                        variant="ghost"
                        size="icon"
                        class="w-8 h-8 ml-2"
                        @click="chatViewVisible = true"
                      >
                        <MessageCircle />
                        <span class="sr-only">Toggle chat view</span>
                      </Button>
                    </div>
                  </div>
                </header>

                <main ref="mainElementRef" class="w-full h-screen -mt-[64px] pt-[64px] overflow-y-auto @container">
                  <router-view v-slot="{ Component, route: $route }">
                    <keep-alive>
                      <component :is="Component" :key="$route.path" />
                    </keep-alive>
                  </router-view>
                </main>
              </div>
            </ResizablePanel>

            <ResizableHandle v-if="route.path !== '/' && chatViewVisible" />

            <ResizablePanel v-show="chatViewVisible" :default-size="50">
              <div>
                <header
                  data-tauri-drag-region
                  class="sticky h-[64px] px-4 pt-[28px] backdrop-blur-lg z-10 transition-colors duration-300"
                  :class="chatScrollY > 40 ? 'bg-sidebar/90' : 'bg-sidebar/50'"
                >
                  <div class="w-full flex flex-row items-center justify-between gap-4">
                    <div class="w-full flex flex-row items-center gap-2" :class="route.path === '/' ? '-ml-2' : ''">
                      <div
                        class="flex-1 flex flex-row items-center gap-2"
                        data-tauri-drag-region
                      >
                        <template v-if="route.path === '/'">
                          <SidebarTrigger class="w-8 h-8" />
                        </template>
                        <transition name="page-title" mode="out-in">
                          <div
                            v-if="chatTitle"
                            :key="chatTitle"
                            class="flex-1 flex flex-row items-center gap-2"
                            data-tauri-drag-region
                          >
                            <Separator v-if="route.path === '/'" orientation="vertical" class="!h-5 mr-1 shrink-0" />
                            <p class="leading-none line-clamp-1">
                              {{ chatTitle }}
                            </p>
                          </div>
                        </transition>
                      </div>
                      <div id="chat-header-start" />
                    </div>
                    <div class="flex flex-row items-center justify-end -mr-2">
                      <div id="chat-header-end" class="flex-shrink-0" />
                      <Button
                        v-if="route.path !== '/'"
                        variant="ghost"
                        size="icon"
                        class="w-8 h-8"
                        @click="chatViewVisible = false"
                      >
                        <ChevronRight />
                        <span class="sr-only">Toggle chat view</span>
                      </Button>
                    </div>
                  </div>
                </header>

                <main class="w-full h-screen -mt-[64px] pt-[64px] overflow-y-auto @container">
                  <KeepAlive>
                    <LLMChatView :key="chatId" />
                  </KeepAlive>
                </main>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </SidebarProvider>
      <Toaster />
    </RootProvider>
  </Suspense>
</template>

<style>
.page-title-enter-active {
  transition: all 0.2s ease-out;
}

.page-title-leave-active {
  transition: all 0.2s ease-in;
}

.page-title-enter-from,
.page-title-leave-to {
  opacity: 0;
}

.page-title-enter-from {
  transform: translateX(-20px);
}

.page-title-enter-to,
.page-title-leave-from {
  transform: translateX(0px);
}

.page-title-leave-to {
  transform: translateX(20px);
}
</style>
