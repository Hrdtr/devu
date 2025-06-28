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
    <ResponsiveDialogContent class="md:max-w-[700px] lg:max-w-[800px] max-h-[80vh] p-0 flex flex-col overflow-hidden bg-sidebar">
      <ResponsiveDialogHeader class="sr-only">
        <ResponsiveDialogTitle>
          Settings
        </ResponsiveDialogTitle>
        <ResponsiveDialogDescription>
          Customize your settings here.
        </ResponsiveDialogDescription>
      </ResponsiveDialogHeader>

      <SidebarProvider class="[&_.w-\(--sidebar-width\)]:will-change-[width] [&_.w-\(--sidebar-width\)]:!ease-in-out [&_.w-\(--sidebar-width\)]:!duration-400">
        <Sidebar class="!border-0">
          <SidebarContent class="pt-[28px] pb-[12px] md:p-0">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem v-for="item in data.nav" :key="item.name">
                    <SidebarMenuButton
                      as-child
                      class="cursor-default data-[active=true]:!bg-primary/5 data-[active=true]:!text-primary data-[active=true]:!font-normal"
                      :is-active="activeMenu.name === item.name"
                    >
                      <a href="#" @click.stop.prevent="activeMenu = item">
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
        <!-- h-[calc(80vh-16px-2px), -2px because the inner sidebar content container has 1px border, top border + bottom border = 2px -->
        <main class="flex h-[calc(80vh-16px-2px)] flex-1 flex-col overflow-hidden bg-background m-[8px] rounded-[8px] shadow-[0_0px_3px_0_var(--tw-shadow-color,_rgb(0_0_0_/_0.1))] shadow-foreground/20">
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
