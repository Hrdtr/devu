<script setup lang="ts">
import type { ApiRouteOutput } from '@/composables/use-api'
import { Field, useForm } from 'vee-validate'
import { onActivated, onDeactivated, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { z } from 'zod'
import { CodeMirror } from '@/components/code-mirror'
import { languages } from '@/components/code-mirror/languages'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCodeSnippet } from '@/composables/use-code-snippet'

const props = defineProps<{
  update?: ApiRouteOutput['codeSnippet']['list']['data'][number]
  readonly?: boolean
}>()
const emit = defineEmits<{
  created: [data: ApiRouteOutput['codeSnippet']['list']['data'][number]]
  updated: [data: ApiRouteOutput['codeSnippet']['list']['data'][number]]
}>()

const route = useRoute()
const activated = ref(false)
onActivated(() => (activated.value = true))
onDeactivated(() => (activated.value = false))
watch(() => route.fullPath, () => (activated.value = false))

const { createCodeSnippet, updateCodeSnippet } = useCodeSnippet()

const { values, handleSubmit, isSubmitting } = useForm({
  validationSchema: z.object({
    name: z.string().min(1),
    language: z.enum(['text', ...languages]),
    code: z.string().min(1),
  }),
  initialValues: props.update
    ? {
        name: props.update.name,
        language: props.update.language,
        code: props.update.code,
      }
    : {
        name: '',
        language: 'text' as string,
        code: '',
      },
  keepValuesOnUnmount: true,
})

const submit = handleSubmit(async (formValues) => {
  if (props.update) {
    const snippet = await updateCodeSnippet(props.update.id, formValues)
    if (snippet) {
      emit('updated', snippet)
    }
  }
  else {
    const snippet = await createCodeSnippet(formValues)
    if (snippet) {
      emit('created', snippet)
    }
  }
}, console.error)
</script>

<template>
  <form class="h-full flex flex-col" @submit="submit">
    <Teleport v-if="activated" to="#header-start">
      <div class="flex flex-row gap-2 items-center justify-between px-1 pb-0">
        <Field v-slot="{ componentField }" name="name">
          <Input
            :disabled="isSubmitting"
            :readonly="props.readonly"
            v-bind="componentField"
            placeholder="Name"
            class="!h-8"
          />
        </Field>
        <Field v-slot="{ componentField }" name="language">
          <Select v-bind="componentField" :disabled="isSubmitting" :readonly="props.readonly">
            <SelectTrigger class="!h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem v-for="option in ['text', ...languages]" :key="option" :value="option">
                  {{ option }}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Teleport>
    <Teleport v-if="activated" to="#header-end">
      <Button
        size="sm"
        class="!h-8"
        type="submit"
        @click="submit"
      >
        Save
      </Button>
    </Teleport>
    <div class="flex-1 overflow-y-auto">
      <Field v-slot="{ value, handleChange }" name="code">
        <CodeMirror
          :disabled="isSubmitting"
          :readonly="props.readonly"
          :lang="values.language === 'text' ? undefined : values.language"
          :model-value="value"
          class="rounded-none !border-0 !ring-0"
          @update:model-value="handleChange"
        />
      </Field>
      <pre
        class="rounded-none !border-0 !ring-0"
      >
        {{ values }}
      </pre>
    </div>
  </form>
</template>
