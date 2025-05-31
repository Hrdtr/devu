<script setup lang="ts">
import type { ApiRouteOutput } from '@/composables/use-api'
import { ArrowRight, History } from 'lucide-vue-next'
import { onActivated, onDeactivated, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { JSONSchemaForm } from '@/components/json-schema-form'
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogDescription, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogTrigger } from '@/components/responsive-dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { UtilityInvocationHistories, UtilityOutput } from '@/components/utility'
import { useApi } from '@/composables/use-api'
import { useMainElementRef } from '@/composables/use-main-element-ref'
import { usePageMeta } from '@/composables/use-page-meta'

const route = useRoute()
const mainElementRef = useMainElementRef()

const activated = ref(false)
onActivated(() => (activated.value = true))
onDeactivated(() => (activated.value = false))
watch(() => route.fullPath, () => (activated.value = false))

const { $fetch, client, safe } = useApi()
const { title } = usePageMeta()

const meta = ref<null | undefined | ApiRouteOutput['utility']['all'][number]>(null)
onMounted(async () => {
  meta.value = await $fetch(`/utilities/${route.params.id}`).then(response => response.json())
  title.value = meta.value ? `Utility: ${meta.value.name}` : undefined
})
onActivated(() => {
  title.value = meta.value ? `Utility: ${meta.value.name}` : undefined
})

const inputRef = useTemplateRef('input')
const optionsRef = useTemplateRef('options')
const outputRef = useTemplateRef('output')

async function submit() {
  if (inputRef.value) {
    const [inputValues, optionsValues] = await Promise.all([inputRef.value.submit(), optionsRef.value?.submit()])
    if (inputRef.value.error || optionsRef.value?.error) {
      return
    }
    const values = { input: inputValues, options: optionsValues || null }

    let response: any
    const fetchResponse = await $fetch(`/utilities/${route.params.id}/invoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(values),
    })
    try {
      response = await fetchResponse.json()
    }
    catch (e) {
      response = await fetchResponse.text().catch(() => {
        toast.error((e as Error)?.message || 'Something went wrong')
        return undefined
      })
    }

    if (!response) {
      return
    }

    outputRef.value?.setValue(response)
    if (mainElementRef.value) {
      mainElementRef.value.scrollTo({ top: (outputRef.value?.$el.offsetTop || 0) - 72, behavior: 'smooth' })
    }
  }
}

const historyDialogVisible = ref(false)
const histories = ref<ApiRouteOutput['utility']['invocationHistories']['list']>()
async function fetchInvocationHistories() {
  const { data, error } = await safe(client.utility.invocationHistories.list({ utility: String(route.params.id) }))
  if (error) {
    toast.error(error?.message || String(error))
    return
  }
  histories.value = data
}
onMounted(fetchInvocationHistories)
</script>

<template>
  <div v-if="meta" class="p-4 grid grid-cols-1 @3xl:grid-cols-2 gap-4">
    <Teleport v-if="activated" to="#header-end">
      <div class="shrink-0 flex flex-row items-center justify-end gap-2 -mr-2">
        <ResponsiveDialog v-model:open="historyDialogVisible">
          <ResponsiveDialogTrigger as-child>
            <Button
              variant="ghost"
              size="sm"
              class="w-8 h-8"
            >
              <History />
              <span class="sr-only">Invocation Histories</span>
            </Button>
          </ResponsiveDialogTrigger>
          <ResponsiveDialogContent class="max-h-[80vh] flex flex-col p-0">
            <ResponsiveDialogHeader class="p-6 pb-0">
              <ResponsiveDialogTitle>Invocation Histories</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Here are the invocation histories for this utility.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <div class="flex-1 overflow-hidden">
              <UtilityInvocationHistories
                :utility="String(route.params.id)"
                class="[&_>_div.search-wrapper]:px-6 [&_>_div_.overflow-y-auto]:p-6 [&_>_div_.overflow-y-auto]:pt-0"
                @restore="(value) => {
                  inputRef?.setValue(value.input)
                  if (value.options) {
                    optionsRef?.setValue(value.options)
                  }
                  outputRef?.setValue(value.output)
                  historyDialogVisible = false
                }"
              />
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      </div>
    </Teleport>

    <form class="@container" @submit.prevent="submit">
      <JSONSchemaForm
        ref="input"
        as="fieldset"
        :schema="meta.schema.input"
        class="[&_button[type=submit]]:hidden"
      />
      <Separator v-if="meta.schema.options && meta.schema.options.type !== 'null'" class="my-4" />
      <JSONSchemaForm
        v-if="meta.schema.options && meta.schema.options.type !== 'null'"
        ref="options"
        as="fieldset"
        :schema="meta.schema.options"
        class="[&_button[type=submit]]:hidden grid @2xl:grid-cols-2 gap-x-4"
      />
      <div class="flex flex-row justify-end mt-2">
        <Button type="submit" size="lg" class="!px-6">
          Invoke
          <ArrowRight />
        </Button>
      </div>
    </form>

    <UtilityOutput ref="output" as="div" :schema="meta.schema.output" />
  </div>
</template>
