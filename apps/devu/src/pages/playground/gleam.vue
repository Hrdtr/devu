<script setup lang="ts">
import type { HeadlessLiveCodesConfig } from '@/composables/use-headless-livecodes'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CodeMirror } from '@/components/code-mirror'
import { PlaygroundLayout, PlaygroundOutput } from '@/components/playground'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useHeadlessLiveCodes } from '@/composables/use-headless-livecodes'

const route = useRoute()

const gleam = ref(route.query.gleam
  ? String(route.query.gleam)
  : `import gleam/io
import gleam/string

pub fn main() {
  "hello, World!"
  |> string.uppercase
  |> io.println
}
`)

const config = computed<HeadlessLiveCodesConfig>(() => ({
  script: {
    language: 'gleam',
    content: gleam.value,
  },
}))
const { code, consoleEntries } = useHeadlessLiveCodes(config)
</script>

<template>
  <PlaygroundLayout v-slot="{ wrapperWidth }">
    <ResizablePanelGroup :direction="wrapperWidth > 640 ? 'horizontal' : 'vertical'">
      <ResizablePanel>
        <CodeMirror
          v-model="gleam"
          lang="gleam"
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
