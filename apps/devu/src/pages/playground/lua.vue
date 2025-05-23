<script setup lang="ts">
import type { HeadlessLiveCodesConfig } from '@/composables/use-headless-livecodes'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CodeMirror } from '@/components/code-mirror'
import { PlaygroundLayout, PlaygroundOutput } from '@/components/playground'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useHeadlessLiveCodes } from '@/composables/use-headless-livecodes'

const route = useRoute()

const lua = ref(route.query.lua
  ? String(route.query.lua)
  : `time = os.date("*t").hour
if time < 12 then
  print ("Good morning")
elseif time >= 12 and time < 18 then
  print ("Good afternoon")
else
  print ("Good evening")
end
`)

const config = computed<HeadlessLiveCodesConfig>(() => ({
  script: {
    language: 'lua-wasm',
    content: lua.value,
  },
}))
const { code, consoleEntries } = useHeadlessLiveCodes(config)
</script>

<template>
  <PlaygroundLayout v-slot="{ wrapperWidth }">
    <ResizablePanelGroup :direction="wrapperWidth > 640 ? 'horizontal' : 'vertical'">
      <ResizablePanel>
        <CodeMirror
          v-model="lua"
          lang="lua"
          class="rounded-none !border-0 !ring-0"
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <PlaygroundOutput
          v-bind="{
            code,
            consoleEntries,
            default: 'console',
            console: true,
          }"
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  </PlaygroundLayout>
</template>
