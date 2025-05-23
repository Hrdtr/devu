<script setup lang="ts">
import type { HeadlessLiveCodesConfig } from '@/composables/use-headless-livecodes'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CodeMirror } from '@/components/code-mirror'
import { PlaygroundLayout, PlaygroundOutput } from '@/components/playground'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useHeadlessLiveCodes } from '@/composables/use-headless-livecodes'

const route = useRoute()

const typescript = ref(route.query.typescript
  ? String(route.query.typescript)
  : `function greet(name: string) {
  console.log(\`Hello, \${name}!\`)
}

greet('World')
`)

const config = computed<HeadlessLiveCodesConfig>(() => ({
  script: {
    language: 'typescript',
    content: typescript.value,
  },
}))
const { code, consoleEntries } = useHeadlessLiveCodes(config)
</script>

<template>
  <PlaygroundLayout v-slot="{ wrapperWidth }">
    <ResizablePanelGroup :direction="wrapperWidth > 640 ? 'horizontal' : 'vertical'">
      <ResizablePanel>
        <CodeMirror
          v-model="typescript"
          lang="typescript"
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
            compiled: {
              default: 'script',
              script: true,
            },
          }"
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  </PlaygroundLayout>
</template>
