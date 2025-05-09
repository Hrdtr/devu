<script setup lang="ts">
import { AppSidebar } from '@/components/app-sidebar'
import { RootProvider } from '@/components/root-provider'
import { Separator } from '@/components/ui/separator'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { useMainElementRef } from '@/composables/use-main-element-ref'
import { usePageMeta } from '@/composables/use-page-meta'
import { useColorMode, useScroll } from '@vueuse/core'
import { titleCase } from 'scule'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const { title } = usePageMeta()

const { store, system } = useColorMode()
const isDarkMode = computed(() => store.value === 'auto' ? system.value : store.value)
watch(isDarkMode, (value) => {
  document.documentElement.classList[value === 'dark' ? 'add' : 'remove']('dark')
  document.documentElement.classList[value === 'light' ? 'add' : 'remove']('light')
})

const sidebarExpanded = ref<boolean>()
const mainElementRef = useMainElementRef()
const { y: mainScrollY } = useScroll(mainElementRef)

const menuItemSelected = ref<string | undefined>()

watch(() => menuItemSelected.value, (value) => {
  if (!value) {
    return router.replace('/')
  }
  const [kind, id] = value.split(':')
  router.replace(`/${{ chat: 'chats', utility: 'utilities' }[kind]}/${id}`)
})
</script>

<template>
  <Suspense>
    <RootProvider>
      <SidebarProvider v-model:open="sidebarExpanded">
        <AppSidebar v-model:menu-item-selected="menuItemSelected" />
        <div class="w-full">
          <header
            data-tauri-drag-region
            class="sticky h-[80px] px-2 pt-[40px] backdrop-blur-lg z-10 transition-colors duration-300"
            :class="mainScrollY > 40 ? 'bg-sidebar/90' : 'bg-sidebar/50'"
          >
            <div class="w-full flex flex-row items-center gap-4">
              <div class="w-full flex flex-row items-center gap-2">
                <SidebarTrigger />
                <transition name="page-title" mode="out-in">
                  <div
                    v-if="title || menuItemSelected" :key="(title || menuItemSelected)?.toLowerCase()"
                    class="flex-1 flex flex-row items-center gap-2"
                  >
                    <Separator orientation="vertical" class="!h-5 mr-1 shrink-0" />
                    <p v-if="title" class="leading-none line-clamp-1">
                      <template v-if="title.includes(':')">
                        <span class="text-muted-foreground">{{ title.split(':')[0].trim() }}:</span> {{
                          title.split(':')[1].trim() }}
                      </template>
                      <template v-else>
                        {{ title }}
                      </template>
                    </p>
                    <p v-else-if="menuItemSelected">
                      <span class="text-muted-foreground">{{ titleCase(menuItemSelected?.split(':')[0].trim())
                      }}:</span>
                      {{
                        titleCase(menuItemSelected?.split(':')[1].trim()) }}
                    </p>
                  </div>
                </transition>
              </div>
              <div id="header-actions" />
            </div>
          </header>

          <main ref="mainElementRef" class="w-full h-screen -mt-[80px] pt-[80px] overflow-y-auto @container">
            <router-view v-slot="{ Component, route }">
              <keep-alive>
                <component :is="Component" :key="route.path" />
              </keep-alive>
            </router-view>
          </main>
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
