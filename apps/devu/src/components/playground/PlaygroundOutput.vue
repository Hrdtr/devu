<script setup lang="ts">
import type { UnwrapRef } from 'vue'
import type { useHeadlessLiveCodes } from '@/composables/use-headless-livecodes'
import { computed } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const props = withDefaults(defineProps<{
  code?: UnwrapRef<ReturnType<typeof useHeadlessLiveCodes>['code']>
  consoleEntries?: UnwrapRef<ReturnType<typeof useHeadlessLiveCodes>['consoleEntries']>
  default?: 'document' | 'console' | 'compiled'
  document?: boolean | string
  console?: boolean | string
  compiled?: {
    default?: 'markup' | 'style' | 'script'
    markup?: boolean | string
    style?: boolean | string
    script?: boolean | string
  }
}>(), {
  console: true,
})

const showTabs = computed(() => {
  return [props.document, props.console, props.compiled].filter(Boolean).length > 1
})
const showCompiledInnerTabs = computed(() => {
  return [props.compiled?.markup, props.compiled?.style, props.compiled?.script].filter(Boolean).length > 1
})
</script>

<template>
  <template v-if="!showTabs">
    <div v-if="props.document" class="w-full h-full select-auto bg-white">
      <iframe :srcdoc="props.code?.result" class="w-full h-full" />
    </div>
    <div v-else-if="props.console" class="w-full h-full py-1 overflow-y-auto select-auto">
      <template v-for="(item, itemIndex) in props.consoleEntries" :key="`console-${itemIndex}`">
        <pre
          v-for="(arg, index) in item.args"
          :key="index"
          class="text-sm px-3 py-0.5 border-b border-border/60 last:border-b-0"
          :class="{ 'text-destructive-foreground': item.method === 'error' }"
        >{{ arg }}</pre>
      </template>
    </div>
    <div v-else-if="props.compiled" :class="!showCompiledInnerTabs ? 'w-full h-full px-3 py-2 overflow-y-auto select-auto' : 'w-full h-full'">
      <pre v-if="!showCompiledInnerTabs" class="text-sm">{{ props.compiled.markup
        ? props.code?.markup.compiled
        : props.compiled.style
          ? props.code?.style.compiled
          : props.compiled.script
            ? props.code?.script.compiled
            : undefined }}</pre>
      <Tabs
        v-else
        :default-value="props.compiled.default ? props.compiled.default : props.compiled.markup ? 'markup' : props.compiled.style ? 'style' : props.compiled.script ? 'script' : undefined"
        class="w-full h-full gap-0"
      >
        <div class="bg-muted">
          <TabsList class="rounded-none">
            <TabsTrigger v-if="props.compiled.markup" value="markup" class="data-[state=active]:bg-muted data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
              {{ typeof props.compiled.markup === 'string' ? props.compiled.markup : 'Markup' }}
            </TabsTrigger>
            <TabsTrigger v-if="props.compiled.style" value="style" class="data-[state=active]:bg-muted data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
              {{ typeof props.compiled.style === 'string' ? props.compiled.style : 'Style' }}
            </TabsTrigger>
            <TabsTrigger v-if="props.compiled.script" value="script" class="data-[state=active]:bg-muted data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
              {{ typeof props.compiled.script === 'string' ? props.compiled.script : 'Script' }}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="markup" class="w-full h-full px-3 py-2 overflow-y-auto select-auto">
          <pre class="text-sm">{{ props.code?.markup.compiled }}</pre>
        </TabsContent>
        <TabsContent value="style" class="w-full h-full px-3 py-2 overflow-y-auto select-auto">
          <pre class="text-sm">{{ props.code?.style.compiled }}</pre>
        </TabsContent>
        <TabsContent value="script" class="w-full h-full px-3 py-2 overflow-y-auto select-auto">
          <pre class="text-sm">{{ props.code?.script.compiled }}</pre>
        </TabsContent>
      </Tabs>
    </div>
  </template>
  <Tabs
    v-else
    :default-value="props.default ? props.default : props.document ? 'document' : props.console ? 'console' : props.compiled ? 'compiled' : undefined"
    class="w-full h-full gap-0"
  >
    <div class="bg-muted">
      <TabsList class="rounded-none">
        <TabsTrigger v-if="props.document" value="document" class="data-[state=active]:bg-muted data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
          {{ typeof props.document === 'string' ? props.document : 'Result' }}
        </TabsTrigger>
        <TabsTrigger v-if="props.console" value="console" class="data-[state=active]:bg-muted data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
          {{ typeof props.console === 'string' ? props.console : 'Console' }}
        </TabsTrigger>
        <TabsTrigger v-if="props.compiled" value="compiled" class="data-[state=active]:bg-muted data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
          {{ typeof props.compiled === 'string' ? props.compiled : 'Compiled' }}
        </TabsTrigger>
      </TabsList>
    </div>
    <TabsContent v-if="props.document" value="document" class="w-full h-full select-auto bg-white">
      <iframe :srcdoc="props.code?.result" class="w-full h-full" />
    </TabsContent>
    <TabsContent v-if="props.console" value="console" class="w-full h-full py-1 overflow-y-auto select-auto">
      <template v-for="(item, itemIndex) in props.consoleEntries" :key="`console-${itemIndex}`">
        <pre
          v-for="(arg, index) in item.args"
          :key="index"
          class="text-sm px-3 py-0.5 border-b border-border/60 last:border-b-0"
          :class="{ 'text-destructive-foreground': item.method === 'error' }"
        >{{ arg }}</pre>
      </template>
    </TabsContent>
    <TabsContent v-if="props.compiled" value="compiled" :class="!showCompiledInnerTabs ? 'w-full h-full px-3 py-2 overflow-y-auto select-auto' : 'w-full h-full'">
      <pre v-if="!showCompiledInnerTabs" class="text-sm">{{ props.compiled.markup
        ? props.code?.markup.compiled
        : props.compiled.style
          ? props.code?.style.compiled
          : props.compiled.script
            ? props.code?.script.compiled
            : undefined }}</pre>
      <Tabs
        v-else
        :default-value="props.compiled.default ? props.compiled.default : props.compiled.markup ? 'markup' : props.compiled.style ? 'style' : props.compiled.script ? 'script' : undefined"
        class="w-full h-full gap-0"
      >
        <div class="bg-muted">
          <TabsList class="rounded-none">
            <TabsTrigger v-if="props.compiled.markup" value="markup" class="data-[state=active]:bg-muted data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
              {{ typeof props.compiled.markup === 'string' ? props.compiled.markup : 'Markup' }}
            </TabsTrigger>
            <TabsTrigger v-if="props.compiled.style" value="style" class="data-[state=active]:bg-muted data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
              {{ typeof props.compiled.style === 'string' ? props.compiled.style : 'Style' }}
            </TabsTrigger>
            <TabsTrigger v-if="props.compiled.script" value="script" class="data-[state=active]:bg-muted data-[state=active]:shadow-none text-muted-foreground data-[state=active]:text-foreground">
              {{ typeof props.compiled.script === 'string' ? props.compiled.script : 'Script' }}
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="markup" class="w-full h-full px-3 py-2 overflow-y-auto select-auto">
          <pre class="text-sm">{{ props.code?.markup.compiled }}</pre>
        </TabsContent>
        <TabsContent value="style" class="w-full h-full px-3 py-2 overflow-y-auto select-auto">
          <pre class="text-sm">{{ props.code?.style.compiled }}</pre>
        </TabsContent>
        <TabsContent value="script" class="w-full h-full px-3 py-2 overflow-y-auto select-auto">
          <pre class="text-sm">{{ props.code?.script.compiled }}</pre>
        </TabsContent>
      </Tabs>
    </TabsContent>
  </Tabs>
</template>
