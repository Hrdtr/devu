<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useClipboardItems } from '@vueuse/core'
import { Check, Copy, Trash } from 'lucide-vue-next'
import { Field, useForm } from 'vee-validate'
import { nextTick, onActivated, onDeactivated, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { CodeMirror } from '@/components/code-mirror'
import { languages } from '@/components/code-mirror/languages'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApi } from '@/composables/use-api'
import { useCodeSnippet } from '@/composables/use-code-snippet'

const route = useRoute()
const router = useRouter()

const activated = ref(false)
onActivated(() => (activated.value = true))
onDeactivated(() => (activated.value = false))
watch(() => route.fullPath, () => (activated.value = false))

const { client, safe } = useApi()
const { codeSnippetState, createCodeSnippet, updateCodeSnippet, deleteCodeSnippet } = useCodeSnippet()

const { values, setValues, handleSubmit, isSubmitting, resetForm } = useForm({
  validationSchema: toTypedSchema(z.object({
    name: z.string().min(1),
    language: z.enum(['text', ...languages]),
    code: z.string().min(1),
  })),
  initialValues: {
    name: '',
    language: 'text' as 'text' | (typeof languages[number]),
    code: '',
  },
  keepValuesOnUnmount: true,
})

onMounted(async () => {
  if (route.params.id === 'new') {
    return
  }
  const { data, error } = await safe(client.codeSnippet.retrieve({ id: String(route.params.id) }))
  if (error) {
    toast.error(error.message)
    return
  }
  setValues({
    name: data.name,
    language: data.language as 'text' | (typeof languages[number]),
    code: data.code,
  }, false)
})

const submit = handleSubmit(async (formValues) => {
  if (route.params.id !== 'new') {
    await updateCodeSnippet(String(route.params.id), formValues)
    toast.success('Code snippet updated!')
  }
  else {
    const snippet = await createCodeSnippet(formValues)
    toast.success('Code snippet saved!')
    resetForm()
    router.replace(`/snippets/${snippet?.id}`)
  }
}, async (error) => {
  if (Object.keys(error.errors).length > 0) {
    for (const [key, value] of Object.entries(error.errors)) {
      toast.error(`${key}: ${value}`)
      await nextTick()
    }
  }
  else {
    console.error(error)
  }
})

const { copy, copied, isSupported } = useClipboardItems()

function createClipboardItem(type: string, data: any) {
  return new ClipboardItem({ [type]: new Blob([data], { type }) })
}
</script>

<template>
  <form class="h-full flex flex-col" @submit="submit">
    <Teleport v-if="activated" to="#header-start">
      <div class="flex flex-row gap-2 items-center justify-between px-1 pb-0">
        <Field v-slot="{ componentField }" name="name">
          <Input
            :disabled="isSubmitting"
            v-bind="componentField"
            placeholder="Name"
            class="!h-8"
          />
        </Field>
        <Field v-slot="{ componentField }" name="language">
          <Select v-bind="componentField" :disabled="isSubmitting">
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
      <div class="shrink-0 flex flex-row items-center justify-end gap-2">
        <AlertDialog v-if="route.params.id !== 'new'">
          <AlertDialogTrigger as-child>
            <Button
              variant="destructive"
              size="sm"
              class="w-8 h-8"
              :disabled="codeSnippetState !== 'idle'"
            >
              <Trash />
              <span class="sr-only">Delete snippet</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this snippet. <b>Cannot be undone.</b>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction @click="deleteCodeSnippet(String(route.params.id)).then(() => router.replace('/snippets/new'))">
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button
          v-if="isSupported && values.code"
          variant="secondary"
          size="sm"
          class="w-8 h-8"
          :disabled="codeSnippetState !== 'idle'"
          @click="!copied && copy([createClipboardItem('text/plain', values.code)]).catch(toast.error)"
        >
          <component :is="copied ? Check : Copy" :class="copied ? 'text-green-500' : ''" />
          <span class="sr-only">Copy to clipboard</span>
        </Button>
        <Button
          size="sm"
          class="!h-8"
          type="submit"
          :disabled="isSubmitting"
          @click="submit"
        >
          Save
        </Button>
      </div>
    </Teleport>
    <div class="flex-1 overflow-y-auto">
      <Field v-slot="{ value, handleChange }" name="code">
        <CodeMirror
          :disabled="isSubmitting"
          :lang="values.language === 'text' ? undefined : values.language"
          :model-value="value"
          class="rounded-none !border-0 !ring-0"
          @update:model-value="handleChange"
        />
      </Field>
    </div>
  </form>
</template>
