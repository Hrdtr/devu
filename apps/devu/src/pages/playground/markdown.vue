<script setup lang="ts">
import type { HeadlessLiveCodesConfig } from '@/composables/use-headless-livecodes'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CodeMirror } from '@/components/code-mirror'
import { PlaygroundLayout } from '@/components/playground'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useHeadlessLiveCodes } from '@/composables/use-headless-livecodes'
import '@/assets/styles/github-markdown.css'

const route = useRoute()

const markdown = ref(route.query.markdown
  ? String(route.query.markdown)
  : '# Hello, World!\n')

const config = computed<HeadlessLiveCodesConfig>(() => ({
  markup: {
    language: 'markdown',
    content: markdown.value,
  },
}))
const { code } = useHeadlessLiveCodes(config)
</script>

<template>
  <PlaygroundLayout v-slot="{ wrapperWidth }">
    <ResizablePanelGroup :direction="wrapperWidth > 640 ? 'horizontal' : 'vertical'">
      <ResizablePanel>
        <CodeMirror
          v-model="markdown"
          lang="markdown"
          class="rounded-none !border-0 !ring-0"
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <div class="h-full p-3 overflow-y-auto select-auto">
          <div class="markdown-body" v-html="code?.markup.compiled" />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </PlaygroundLayout>
</template>
