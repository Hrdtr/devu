<script setup lang="ts">
import type { HeadlessLiveCodesConfig } from '@/composables/use-headless-livecodes'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CodeMirror } from '@/components/code-mirror'
import { PlaygroundLayout, PlaygroundOutput } from '@/components/playground'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHeadlessLiveCodes } from '@/composables/use-headless-livecodes'

const route = useRoute()

const html = ref(route.query.html
  ? String(route.query.html)
  : '<h1>Hello World!</h1>\n')
const css = ref(route.query.css
  ? String(route.query.css)
  : 'h1 { color: blue; }\n')
const javascript = ref(route.query.javascript
  ? String(route.query.javascript)
  : 'console.log("Hello, World!")\n')

const config = computed<HeadlessLiveCodesConfig>(() => ({
  markup: {
    language: 'html',
    content: html.value,
  },
  style: {
    language: 'css',
    content: css.value,
  },
  script: {
    language: 'javascript',
    content: javascript.value,
  },
}))
const { code, consoleEntries } = useHeadlessLiveCodes(config)
</script>

<template>
  <PlaygroundLayout v-slot="{ wrapperWidth }">
    <ResizablePanelGroup :direction="wrapperWidth > 640 ? 'horizontal' : 'vertical'">
      <ResizablePanel>
        <Tabs default-value="markup" class="w-full h-full gap-0">
          <div class="bg-muted">
            <TabsList class="rounded-none">
              <TabsTrigger value="markup" class="data-[state=active]:!bg-muted data-[state=active]:!text-foreground">
                HTML
              </TabsTrigger>
              <TabsTrigger value="style" class="data-[state=active]:!bg-muted data-[state=active]:!text-foreground">
                CSS
              </TabsTrigger>
              <TabsTrigger value="script" class="data-[state=active]:!bg-muted data-[state=active]:!text-foreground">
                JavaScript
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="markup">
            <CodeMirror
              v-model="html"
              lang="html"
              class="rounded-none !border-0 !ring-0"
            />
          </TabsContent>
          <TabsContent value="style">
            <CodeMirror
              v-model="css"
              lang="css"
              class="rounded-none !border-0 !ring-0"
            />
          </TabsContent>
          <TabsContent value="script">
            <CodeMirror
              v-model="javascript"
              lang="javascript"
              class="rounded-none !border-0 !ring-0"
            />
          </TabsContent>
        </Tabs>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel>
        <PlaygroundOutput
          v-bind="{
            code,
            consoleEntries,
            default: 'document',
            document: true,
            console: true,
          }"
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  </PlaygroundLayout>
</template>
