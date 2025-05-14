<script setup lang="ts">
import type { ApiRouteOutput } from '@/composables/use-api'
import { JSONSchemaForm } from '@/components/json-schema-form'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { UtilityOutput } from '@/components/utility-output'
import { useApi } from '@/composables/use-api'
import { useMainElementRef } from '@/composables/use-main-element-ref'
import { usePageMeta } from '@/composables/use-page-meta'
import { ArrowRight } from 'lucide-vue-next'
import { onActivated, onMounted, ref, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'

const route = useRoute()
const mainElementRef = useMainElementRef()

const { $fetch } = useApi()
const { title } = usePageMeta()

const meta = ref<null | undefined | ApiRouteOutput['utilities']['all'][number]>(null)
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
      mainElementRef.value.scrollTo({ top: outputRef.value?.$el.offsetTop || 0, behavior: 'smooth' })
    }
  }
}
</script>

<template>
  <div v-if="meta" class="p-4 grid grid-cols-1 @3xl:grid-cols-2 gap-4">
    <form class="@container" @submit.prevent="submit">
      <JSONSchemaForm
        ref="input"
        as="fieldset"
        :schema="meta.schema.input"
        class="[&_button[type=submit]]:hidden"
      />
      <Separator v-if="meta.schema.options" class="my-4" />
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
