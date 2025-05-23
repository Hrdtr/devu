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
          class="size-10 !p-2"
          @click="activeView = undefined"
        >
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
          class="size-10 !p-2"
          @click="activeView = `utility:${utilities[0].id}`"
        >
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
          class="size-10 !p-2"
          @click="activeView = `snippet:new`"
        >
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
          class="size-10 !p-2"
          @click="activeView = `playground:${codePlaygrounds[0].id}`"
        >
          <BugPlay class="size-[95%]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        Playground
      </TooltipContent>
    </Tooltip>
  </div>
</template>
