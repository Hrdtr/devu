<script setup lang="ts">
import { useClipboardItems } from '@vueuse/core'
import { Check, Clipboard, Copy } from 'lucide-vue-next'
import { ErrorMessage, Field } from 'vee-validate'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import { CodeMirror } from '@/components/code-mirror'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagsInput, TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText } from '@/components/ui/tags-input'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const props = defineProps<{
  name: string
  label: string
  description?: string
  required?: boolean
  defaultValue?: any
  options?: string[]
  component?: string
  attrs?: Record<string, any>
  disabled?: boolean
  readonly?: boolean
  actions?: {
    copy?: boolean
    paste?: boolean
  }
}>()

const { copy, copied, isSupported } = useClipboardItems()

function createClipboardItem(type: string, data: any) {
  return new ClipboardItem({ [type]: new Blob([data], { type }) })
}

const pasted = ref(false)
async function paste(setValue: (val: string) => void | Promise<void>) {
  if (!isSupported.value)
    return

  try {
    const items = await navigator.clipboard.read()
    if (!items.length)
      return

    const item = items[0]
    const type = item.types.find(t => t === 'text/plain') || item.types[0]
    const blob = await item.getType(type)
    const text = await blob.text()

    await setValue(text)
    pasted.value = true

    setTimeout(() => pasted.value = false, 1500)
  }
  catch (err) {
    toast.error('Failed to paste content from clipboard')
    console.error('Failed to paste content from clipboard:', err)
  }
}
</script>

<template>
  <div>
    <Field v-slot="{ componentField, value, handleChange }" :name="props.name">
      <div class="flex flex-row justify-between items-center gap-4 mb-2">
        <Label v-if="props.component !== 'Checkbox'" :for="props.name">{{ props.label }}</Label>
        <template
          v-if="
            isSupported
              && props.actions?.paste
              && ['Input', 'Textarea', 'CodeMirror'].includes(props.component || '')
          "
        >
          <Tooltip :delay-duration="500">
            <TooltipTrigger as-child>
              <button type="button" @click="!pasted && paste(handleChange)">
                <component :is="pasted ? Check : Clipboard" class="size-4" :class="pasted ? 'text-green-500' : ''" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {{ copied ? 'Pasted' : 'Paste from Clipboard' }}
            </TooltipContent>
          </Tooltip>
        </template>
        <template
          v-if="
            isSupported
              && props.actions?.copy
              && value
              && ['Input', 'Textarea', 'CodeMirror'].includes(props.component || '')
          "
        >
          <Tooltip :delay-duration="500">
            <TooltipTrigger as-child>
              <button
                type="button"
                @click="!copied && copy([createClipboardItem('text/plain', value)]).catch(toast.error)"
              >
                <component :is="copied ? Check : Copy" class="size-4" :class="copied ? 'text-green-500' : ''" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {{ copied ? 'Copied' : 'Copy to Clipboard' }}
            </TooltipContent>
          </Tooltip>
        </template>
      </div>
      <template v-if="props.component === 'Select'">
        <Select v-bind="{ ...componentField, ...props.attrs, disabled: props.disabled, readonly: props.readonly }">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="option in props.options" :key="option" :value="option">
                {{ option }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </template>

      <template v-else-if="props.component === 'Checkbox'">
        <label
          class="flex flex-row items-start gap-x-3 space-y-0 rounded-md border p-3 shadow transition-colors"
          :class="value ? 'border-ring' : 'border-input'"
          v-bind="{ ...props.attrs }"
        >
          <Checkbox
            :id="props.name"
            :model-value="value"
            v-bind="{ disabled: props.disabled || props.readonly, readonly: props.readonly }"
            :class="{ '!opacity-100 !cursor-default': !props.disabled && props.readonly }"
            @update:model-value="handleChange"
          />
          <div class="space-y-1 leading-none">
            <Label :for="props.name">{{ props.label }}</Label>
            <p v-if="props.description" class="text-muted-foreground text-sm mt-1.5">
              {{ props.description }}
            </p>
          </div>
        </label>
      </template>

      <template v-else-if="props.component === 'TagsInput'">
        <TagsInput
          v-bind="{ ...props.attrs, disabled: props.disabled, readonly: props.readonly }"
          :model-value="value"
          @update:model-value="handleChange"
        >
          <TagsInputItem v-for="item in componentField.modelValue" :key="item" :value="item">
            <TagsInputItemText />
            <TagsInputItemDelete />
          </TagsInputItem>
          <TagsInputInput />
        </TagsInput>
      </template>

      <template v-else-if="props.component === 'CodeMirror'">
        <CodeMirror
          v-bind="{ ...props.attrs, disabled: props.disabled, readonly: props.readonly }"
          :model-value="value"
          @update:model-value="handleChange"
        />
      </template>

      <template v-else-if="props.component === 'Textarea'">
        <Textarea v-bind="{ ...componentField, ...props.attrs, disabled: props.disabled, readonly: props.readonly }" autocorrect="off" />
      </template>

      <template v-else-if="props.component === 'Input'">
        <Input v-bind="{ ...componentField, ...props.attrs, disabled: props.disabled, readonly: props.readonly }" autocorrect="off" />
      </template>

      <template v-else>
        <component
          :is="props.component"
          v-bind="{ ...componentField, ...props.attrs, disabled: props.disabled, readonly: props.readonly }"
        />
      </template>
    </Field>

    <p v-if="props.description && props.component !== 'Checkbox'" class="text-muted-foreground text-sm mt-1.5">
      {{ props.description }}
    </p>
    <ErrorMessage :name="props.name" class="text-destructive-foreground text-sm mt-1.5" />
  </div>
</template>
