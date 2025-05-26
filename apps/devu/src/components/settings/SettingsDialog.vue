<script setup lang="ts">
import { Info, Paintbrush, Settings } from 'lucide-vue-next'
import { markRaw, ref } from 'vue'
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogHeader, ResponsiveDialogTitle } from '@/components/responsive-dialog'
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import SettingsAbout from './SettingsAbout.vue'
import SettingsAppearance from './SettingsAppearance.vue'
import SettingsGeneral from './SettingsGeneral.vue'

const data = {
  nav: [
    { name: 'General', icon: Settings, view: markRaw(SettingsGeneral) },
    { name: 'Appearance', icon: Paintbrush, view: markRaw(SettingsAppearance) },
    { name: 'About', icon: Info, view: markRaw(SettingsAbout) },
  ],
}

const open = defineModel('open', {
  default: false,
})

const activeMenu = ref(data.nav.find(item => item.name === 'General') || data.nav[0]) // Keep Appearance active or first
</script>

<template>
  <ResponsiveDialog v-model:open="open">
    <ResponsiveDialogContent class="md:max-w-[700px] lg:max-w-[800px] max-h-[80vh] p-0 flex flex-col overflow-hidden">
      <ResponsiveDialogHeader class="sr-only">
        <ResponsiveDialogTitle>
          Settings
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Customize your settings here.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <SidebarProvider>
        <Sidebar class="!border-0">
          <SidebarContent class="pt-[28px] pb-[12px] md:p-0">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem v-for="item in data.nav" :key="item.name">
                    <SidebarMenuButton
                      as-child
                      :is-active="activeMenu.name === item.name"
                    >
                      <a href="#" @click="activeMenu = item">
                        <component :is="item.icon" />
                        <span>{{ item.name }}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <main class="flex h-full max-h-[80vh] flex-1 flex-col overflow-hidden">
          <header class="shrink-0 flex flex-row items-center gap-2 p-2">
            <SidebarTrigger class="w-8 h-8" />
            <p class="leading-none line-clamp-1">
              <span class="text-muted-foreground">Settings:</span> {{ activeMenu.name }}
            </p>
          </header>
          <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            <component :is="activeMenu.view" />
          </div>
        </main>
      </SidebarProvider>
    </ResponsiveDialogContent>
  </ResponsiveDialog>
</template>
