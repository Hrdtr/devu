<script setup lang="ts">
import { BotMessageSquare, BugPlay, Code2, PencilRuler } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCodePlayground } from '@/composables/use-code-playground'
import { useUtility } from '@/composables/use-utilities'

const activeView = defineModel<string | undefined>('active-view', { required: true })

const route = useRoute()

const { utilities } = useUtility()
const { codePlaygrounds } = useCodePlayground()
</script>

<template>
  <div data-tauri-drag-region class="flex-1 pt-[28px] pb-[12px] flex flex-col items-center gap-1 -mr-2">
    <Tooltip :delay-duration="300">
      <TooltipTrigger as-child>
        <Button
          :variant="route.path === '/' || route.path.startsWith('/chats') ? 'default' : 'ghost'"
          class="size-10 !p-2 text-muted-foreground"
          :class="route.path === '/' || route.path.startsWith('/chats') ? 'bg-primary dark:bg-primary hover:bg-primary dark:hover:bg-primary border-primary text-white shadow-md shadow-primary/25' : ''"
          @click="activeView = undefined"
        >
          <!-- alternative button style: :class="route.path.startsWith('/utilities') ? 'bg-primary/10 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/10 border-primary/10 shadow-none text-primary' : ''" -->
          <BotMessageSquare class="size-full" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        Chats
      </TooltipContent>
    </Tooltip>

    <Tooltip :delay-duration="300">
      <TooltipTrigger as-child>
        <Button
          :variant="route.path.startsWith('/utilities') ? 'default' : 'ghost'"
          class="size-10 !p-2 text-muted-foreground"
          :class="route.path.startsWith('/utilities') ? 'bg-primary dark:bg-primary hover:bg-primary dark:hover:bg-primary border-primary text-white shadow-md shadow-primary/25' : ''"
          @click="activeView = `utility:${utilities[0].id}`"
        >
          <!-- alternative button style: :class="route.path.startsWith('/utilities') ? 'bg-primary/10 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/10 border-primary/10 shadow-none text-primary' : ''" -->
          <PencilRuler class="size-[90%]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        Utilities
      </TooltipContent>
    </Tooltip>

    <Tooltip :delay-duration="300">
      <TooltipTrigger as-child>
        <Button
          :variant="route.path.startsWith('/snippets') ? 'default' : 'ghost'"
          class="size-10 !p-2 text-muted-foreground"
          :class="route.path.startsWith('/snippets') ? 'bg-primary dark:bg-primary hover:bg-primary dark:hover:bg-primary border-primary text-white shadow-md shadow-primary/25' : ''"
          @click="activeView = `snippet:new`"
        >
          <!-- alternative button style: :class="route.path.startsWith('/utilities') ? 'bg-primary/10 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/10 border-primary/10 shadow-none text-primary' : ''" -->
          <Code2 class="size-full" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        Snippets
      </TooltipContent>
    </Tooltip>

    <Tooltip :delay-duration="300">
      <TooltipTrigger as-child>
        <Button
          :variant="route.path.startsWith('/playground') ? 'default' : 'ghost'"
          class="size-10 !p-2 text-muted-foreground"
          :class="route.path.startsWith('/playground') ? 'bg-primary dark:bg-primary hover:bg-primary dark:hover:bg-primary border-primary text-white shadow-md shadow-primary/25' : ''"
          @click="activeView = `playground:${codePlaygrounds[0].id}`"
        >
          <!-- alternative button style: :class="route.path.startsWith('/utilities') ? 'bg-primary/10 dark:bg-primary/10 hover:bg-primary/10 dark:hover:bg-primary/10 border-primary/10 shadow-none text-primary' : ''" -->
          <BugPlay class="size-[95%]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        Playground
      </TooltipContent>
    </Tooltip>
  </div>
</template>
