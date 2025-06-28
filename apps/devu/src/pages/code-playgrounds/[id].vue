<script setup lang="ts">
import { useClipboardItems, useElementBounding } from '@vueuse/core'
import { Check, Copy, LoaderCircle, Play, Settings2 } from 'lucide-vue-next'
import { computed, nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { CodeMirror } from '@/components/code-mirror'
import { JSONSchemaForm } from '@/components/json-schema-form'
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogFooter, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogTrigger } from '@/components/responsive-dialog'
import { Terminal } from '@/components/terminal'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApi } from '@/composables/use-api'
import { usePageMeta } from '@/composables/use-page-meta'
import { defineShortcuts } from '@/utils/define-shortcuts'

const route = useRoute()
const wrapperRef = useTemplateRef('wrapper')
const { width: wrapperWidth } = useElementBounding(wrapperRef)

const activated = ref(false)
onActivated(() => (activated.value = true))
onDeactivated(() => (activated.value = false))
watch(() => route.fullPath, () => (activated.value = false))

const { client } = useApi()
const { title } = usePageMeta()
const meta = await client.codePlayground.retrieve({ id: String(route.params.id) })
const schema = await client.codePlayground.schema({ id: String(route.params.id) })

onMounted(async () => {
  title.value = `Code Playground: ${meta.name}`
})
onActivated(() => {
  title.value = `Code Playground: ${meta.name}`
})

interface InputPropertiesType {
  [key: string]: {
    default?: string
    ui: {
      label: string
      attrs?: Record<string, any>
    }
  }
}

interface OutputPropertiesType {
  [key: string]: {
    ui: {
      label: string
      component: string
      attrs?: Record<string, any>
    }
  }
}

// Input
const inputProperties = computed<InputPropertiesType>(() => {
  return schema.input.properties || {}
})
const input = ref<Record<string, string>>(Object.fromEntries(Object.entries(inputProperties.value).map(([k, v]) => [k, v.default || ''])))

// Options
const optionsDialogVisible = ref(false)
const optionsFormRef = useTemplateRef('optionsForm')
const options = ref<Record<string, any>>(Object.fromEntries(Object.entries(schema.options.properties).map(([k, v]: [any, any]) => [k, v.default])))
async function saveOptions() {
  const { data, valid } = optionsFormRef.value?.validate() || {}
  if (valid) {
    options.value = data
    optionsDialogVisible.value = false
  }
}

watch(optionsFormRef, (value) => {
  if (value) {
    requestAnimationFrame(() => {
      value.setData(JSON.parse(JSON.stringify(options.value)))
    })
  }
})

// Output
const outputProperties = computed<OutputPropertiesType>(() => {
  return schema.output.properties.result.properties || {}
})
const output = ref<Record<string, OutputPropertiesType[keyof OutputPropertiesType] & { ref?: any }>>((() => {
  const tabs: [string, OutputPropertiesType[keyof OutputPropertiesType] & { ref?: any }][] = []
  if (schema.output.properties.stdio.const || Object.values(outputProperties.value).some(i => i.ui.component === 'stdio')) {
    tabs.push(['stdio', {
      ref: undefined,
      ui: {
        label: 'Stdio',
        component: 'stdio',
      },
    }])
  }
  const baseTabs = Object.entries(outputProperties.value)
  for (const [key, tab] of baseTabs) {
    tabs.push([key, { ref: undefined, ui: tab.ui }])
    if (tab.ui.component === 'iframe') {
      tabs.push([`${key}:console`, {
        ref: undefined,
        ui: {
          label: 'Console',
          component: 'Terminal',
        },
      }])
    }
  }
  return Object.fromEntries(tabs)
})())

const outputCodeMirrorValue = ref<Record<string, string | undefined>>({})
const outputTabActive = ref(Object.keys(output.value)[0])

function clearAllIframeConsoleEntries() {
  for (const [_, tab] of Object.entries(output.value).filter(([key]) => key.endsWith(':console'))) {
    const iframeConsole = tab.ref as InstanceType<typeof Terminal> | undefined
    iframeConsole?.clear()
  }
}

// iframe forwarded console handler
function isIframeMessageData(data: unknown): data is { executionId: string, key: string, value?: string[] | string, level: string } {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false
  }

  return ('executionId' in data && typeof data.executionId === 'string'
    && 'key' in data && typeof data.key === 'string'
    && 'level' in data && typeof data.level === 'string')
}
function iframeMessageEventHandler(event: Event) {
  const data = (event as MessageEvent)?.data as MessageEvent['data']
  if (!isIframeMessageData(data)) {
    return
  }

  if (data) {
    const iframeConsole = output.value[`${data.key}:console`]?.ref as InstanceType<typeof Terminal> | undefined
    if (data.level === 'clear') {
      iframeConsole?.clear()
      return
    }
    if (!data.value) {
      return
    }

    const color = { log: undefined, info: 'info', warn: 'warn', error: 'error', debug: 'debug' }[data.level]
    if (Array.isArray(data.value)) {
      for (const item of data.value) {
        for (const line of item.split('\n')) {
          iframeConsole?.writeln.withANSIColor(line, color)
        }
      }
      return
    }
    for (const line of data.value.split('\n')) {
      iframeConsole?.writeln.withANSIColor(line, color)
    }
  }
}
onMounted(() => window.addEventListener('message', iframeMessageEventHandler))
onBeforeUnmount(() => {
  clearAllIframeConsoleEntries()
  window.removeEventListener('message', iframeMessageEventHandler)
})
onActivated(() => window.addEventListener('message', iframeMessageEventHandler))
onDeactivated(() => {
  clearAllIframeConsoleEntries()
  window.removeEventListener('message', iframeMessageEventHandler)
})

// Execution
const executionAbortController = ref<AbortController | null>(null)
const currentExecutionId = ref<string | null>(null)
const executionLocked = computed(() => executionAbortController.value !== null && !currentExecutionId.value)

async function abortExecution(executionId: string) {
  await client.codePlayground.abortExecution({ id: String(route.params.id), executionId })
  executionAbortController.value?.abort()
  executionAbortController.value = null
}

async function execute() {
  // Skip execution request when there is an active execution but no execution id received yet
  if (executionLocked.value) {
    return
  }

  if (currentExecutionId.value) {
    const executionId = currentExecutionId.value
    currentExecutionId.value = null
    await abortExecution(executionId)
  }

  executionAbortController.value = new AbortController()

  const outputStdioRef = output.value.stdio?.ref as InstanceType<typeof Terminal> | undefined
  outputStdioRef?.clear()

  // Others consoles cleanup
  for (const tab of Object.values(output.value).filter(({ ui }) => ui.component === 'Terminal')) {
    const terminal = tab.ref as InstanceType<typeof Terminal> | undefined
    terminal?.clear()
  }
  // CodeMirror output cleanup
  for (const [key, _] of Object.entries(output.value).filter(([_, { ui }]) => ui.component === 'CodeMirror')) {
    outputCodeMirrorValue.value[key] = undefined
  }

  const executionEventIterator = await client.codePlayground.exec({
    id: String(route.params.id),
    input: Object.fromEntries(Object.keys(inputProperties.value).map(k => [k, input.value[k]])),
    options: options.value,
  }, {
    signal: executionAbortController.value.signal,
  })

  const chunks = {
    data: {} as Record<string, { part: number, chunk: string }[] | undefined>,
    error: undefined as { part: number, chunk: string }[] | undefined,
  }

  try {
    for await (const event of executionEventIterator) {
      if (executionAbortController.value?.signal.aborted) {
        break
      }
      else {
        switch (event.type) {
          case 'initialized': {
            currentExecutionId.value = event.data.executionId
            break
          }
          case 'stdout': {
            event.data.split('\n').forEach(line => outputStdioRef?.writeln(line))
            break
          }
          case 'stderr': {
            event.data.split('\n').forEach(line => outputStdioRef?.writeln.withANSIColor(line, 'error'))
            break
          }
          case 'result:chunk': {
            if (event.error !== null) {
              if (!chunks.error) {
                chunks.error = []
              }
              chunks.error.push(JSON.parse(event.error))
            }
            else {
              const key = event.data.key
              if (!chunks.data[key]) {
                chunks.data[key] = []
              }
              chunks.data[key].push(JSON.parse(event.data.value))
            }
            break
          }

          case 'result': {
            if (event.error !== null) {
              const error = `${(chunks.error || []).sort((a, b) => a.part - b.part).map(i => i.chunk).join('')}${event.error}`
              if (outputStdioRef) {
                error.split('\n').forEach(line => outputStdioRef?.writeln.withANSIColor(line, 'fatal'))
              }
              else {
                toast.error(error)
              }
              chunks.error = undefined
            }
            else {
              const key = event.data.key
              const data = `${(chunks.data[key] || []).sort((a, b) => a.part - b.part).map(i => i.chunk).join('')}${event.data.value}`
              const component = output.value[key]?.ui.component
              if (!component) {
                return
              }
              if (component === 'stdio') {
                outputStdioRef?.writeln(data)
              }
              if (component === 'CodeMirror') {
                outputCodeMirrorValue.value[key] = data
              }
              if (component === 'iframe') {
                const iframeRef = output.value[event.data.key].ref as HTMLIFrameElement | undefined
                if (iframeRef) {
                  iframeRef.srcdoc = data
                }
              }
              if (component === 'Terminal') {
                const terminal = output.value[key].ref as InstanceType<typeof Terminal> | undefined
                terminal?.writeln(data)
              }
              chunks.data[key] = undefined
            }
            break
          }
        }
      }
    }
  }
  catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return
    }
    toast.error(error instanceof Error ? error.message : String(error))
  }
  finally {
    await nextTick()
    executionAbortController.value = null
    currentExecutionId.value = null
  }
}

// watchDebounced([input, options], execute, {
//   debounce: 1000,
//   immediate: true,
//   deep: true,
// })

defineShortcuts({
  meta_s: {
    usingInput: true,
    handler: () => {
      if (!activated.value) {
        return
      }
      execute()
    },
  },
  ctrl_c: {
    usingInput: true,
    handler: () => {
      if (!activated.value) {
        return
      }
      if (currentExecutionId.value) {
        const executionId = currentExecutionId.value
        currentExecutionId.value = null
        abortExecution(executionId)
      }
    },
  },
})

const inputTabsContainerRef = useTemplateRef('inputTabsContainer')
const { height: inputTabsContainerHeight } = useElementBounding(inputTabsContainerRef)
const outputTabsContainerRef = useTemplateRef('outputTabsContainer')
const { height: outputTabsContainerHeight } = useElementBounding(outputTabsContainerRef)

const { copy, copied, isSupported } = useClipboardItems()

function createClipboardItem(type: string, data: any) {
  return new ClipboardItem({ [type]: new Blob([data], { type }) })
}
</script>

<template>
  <div v-if="meta && schema" ref="wrapper" class="w-full h-full">
    <Teleport v-if="activated" to="#header-end">
      <div class="shrink-0 flex flex-row items-center justify-end -mr-2">
        <ResponsiveDialog v-model:open="optionsDialogVisible">
          <ResponsiveDialogTrigger as-child>
            <Button
              variant="ghost"
              size="sm"
              class="w-8 h-8"
            >
              <Settings2 />
              <span class="sr-only">Options</span>
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent class="max-h-[80vh] flex flex-col p-0">
            <ResponsiveDialogHeader class="p-6 pb-0">
              <ResponsiveDialogTitle>Execution Options</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Configure the execution options for this code playground.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <div class="flex flex-col overflow-y-auto px-6 py-4">
              <JSONSchemaForm
                v-if="schema.options && schema.options.type !== 'null'"
                ref="optionsForm"
                as="fieldset"
                :schema="schema.options"
                class="[&_button[type=submit]]:hidden grid @2xl:grid-cols-2 gap-x-4"
              />
            </div>

            <ResponsiveDialogFooter class="p-6 pt-0">
              <Button type="submit" @click="saveOptions">
                Submit
              </Button>
            </ResponsiveDialogFooter>
          </ResponsiveDialogContent>
        </ResponsiveDialog>

        <Button
          variant="ghost"
          size="sm"
          class="w-8 h-8"
          :disabled="!!executionAbortController"
          @click="execute"
        >
          <template v-if="!executionAbortController">
            <Play class="scale-90 text-green-500" />
            <span class="sr-only">Execute</span>
          </template>
          <template v-else>
            <LoaderCircle class="animate-spin" />
            <span class="sr-only">Executing...</span>
          </template>
        </Button>
      </div>
    </Teleport>

    <ResizablePanelGroup :direction="wrapperWidth > 640 ? 'horizontal' : 'vertical'">
      <ResizablePanel>
        <Tabs :default-value="Object.keys(schema.input.properties)[0]" class="w-full h-full gap-0">
          <div ref="inputTabsContainer" class="bg-sidebar">
            <TabsList class="bg-sidebar rounded-none">
              <TabsTrigger
                v-for="[key, { ui }] in Object.entries(inputProperties)"
                :key="key"
                :value="key"
                class="!bg-sidebar data-[state=active]:!bg-sidebar !text-muted-foreground data-[state=active]:!text-sidebar-foreground !shadow-none data-[state=active]:!shadow-none !border-none data-[state=active]:!border-none"
              >
                {{ ui.label }}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            v-for="[key, { ui }] in Object.entries(inputProperties)"
            :key="key"
            :value="key"
            class="w-full"
            :style="{ height: `calc(100% - ${inputTabsContainerHeight}px)` }"
          >
            <CodeMirror
              v-model="input[key]"
              v-bind="ui.attrs"
              class="rounded-none !border-0 !ring-0"
            />
          </TabsContent>
        </Tabs>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <Tabs v-model="outputTabActive" class="gap-0">
          <div ref="outputTabsContainer" class="bg-sidebar">
            <div class="flex flex-row items-center justify-between gap-4">
              <TabsList class="bg-sidebar rounded-none">
                <TabsTrigger
                  v-if="Object.values(output).some(i => i.ui.component === 'stdio')"
                  key="stdio"
                  value="stdio"
                  class="!bg-sidebar data-[state=active]:!bg-sidebar !text-muted-foreground data-[state=active]:!text-sidebar-foreground !shadow-none data-[state=active]:!shadow-none !border-none data-[state=active]:!border-none"
                >
                  {{ Object.values(output).find(i => i.ui.component === 'stdio' && i.ui.label !== 'Stdio')?.ui.label || 'Stdio' }}
                </TabsTrigger>

                <TabsTrigger
                  v-for="[key, { ui }] in Object.entries(output).filter(([_, v]) => v.ui.component !== 'stdio')"
                  :key="key"
                  :value="key"
                  class="!bg-sidebar data-[state=active]:!bg-sidebar !text-muted-foreground data-[state=active]:!text-sidebar-foreground !shadow-none data-[state=active]:!shadow-none !border-none data-[state=active]:!border-none"
                >
                  {{ ui.label }}
                </TabsTrigger>
              </TabsList>

              <div class="flex flex-row items-center gap-2 pr-2">
                <Button
                  v-if="isSupported && output[outputTabActive].ui.component === 'CodeMirror' && outputCodeMirrorValue[outputTabActive]"
                  variant="ghost"
                  size="sm"
                  class="w-8 h-8 hover:!bg-transparent text-muted-foreground hover:text-foreground"
                  :disabled="!!executionAbortController"
                  @click="!copied && copy([createClipboardItem('text/plain', outputCodeMirrorValue[outputTabActive])]).catch(toast.error)"
                >
                  <component :is="copied ? Check : Copy" :class="copied ? 'text-green-500' : ''" />
                  <span class="sr-only">Copy to clipboard</span>
                </Button>
              </div>
            </div>
          </div>
        </Tabs>

        <div
          v-if="Object.values(output).some(i => i.ui.component === 'stdio')"
          v-show="outputTabActive === 'stdio'"
          class="w-full"
          :style="{ height: `calc(100% - ${outputTabsContainerHeight}px)` }"
        >
          <Terminal
            :ref="(value) => {
              output.stdio.ref = value
              Object.entries(output).forEach(([key, tab]) => {
                if (tab.ui.component === 'stdio') {
                  output[key].ref = value
                }
              })
            }"
            class="rounded-none !border-0 !ring-0"
          />
        </div>

        <div
          v-for="[key, { ui }] in Object.entries(output).filter(([_, v]) => v.ui.component !== 'stdio')"
          v-show="outputTabActive === key"
          :key="key"
          class="w-full"
          :style="{ height: `calc(100% - ${outputTabsContainerHeight}px)` }"
        >
          <CodeMirror
            v-if="ui.component === 'CodeMirror'"
            :ref="(value) => output[key].ref = value"
            v-bind="ui.attrs"
            v-model="outputCodeMirrorValue[key]"
            readonly
            class="rounded-none !border-0 !ring-0"
          />
          <iframe
            v-if="ui.component === 'iframe'"
            :ref="(value) => output[key].ref = value"
            v-bind="ui.attrs"
            class="w-full h-full bg-white"
          />
          <Terminal
            v-if="ui.component === 'Terminal'"
            :ref="(value) => output[key].ref = value"
            v-bind="ui.attrs"
            class="rounded-none !border-0 !ring-0"
          />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</template>
