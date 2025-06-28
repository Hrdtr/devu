<script lang="ts">
/* eslint-disable import/first */
export type JSONSchemaObjectProperties = Record<
  string,
  {
    type: string
    format?: string
    properties?: JSONSchemaObjectProperties
    enum?: string[]
    default?: string
    title?: string
    description?: string
    ui?: {
      label?: string
      component?: string
      attrs?: Record<string, any>
    }
  }
>

export interface JSONSchemaObject {
  type: 'object'
  required?: string[]
  properties: JSONSchemaObjectProperties
}

export type Field = ReturnType<typeof fieldsFromJSONSchemaObject>[number]

export function fieldsFromJSONSchemaObject(objectSchema: JSONSchemaObject, fieldNamePrefix?: string) {
  const fields: {
    type: string
    name: string
    label: string
    description?: string
    required?: boolean
    defaultValue?: any
    options?: string[]
    component?: string
    attrs?: Record<string, any>
  }[] = []
  for (const [name, def] of Object.entries(objectSchema.properties)) {
    if (def.type === 'object' && def.ui?.component === 'fieldset' && def.properties) {
      fields.push(...fieldsFromJSONSchemaObject({ ...def, type: 'object', properties: def.properties }, fieldNamePrefix ? `${fieldNamePrefix}${name}.` : `${name}.`))
    }
    else {
      fields.push({
        type: def.type ? def.type : (def.enum?.[0] ? typeof def.enum[0] : ''),
        name: fieldNamePrefix ? `${fieldNamePrefix}${name}` : name,
        label: def.ui?.label ?? def.title ?? name,
        description: def.description,
        required: objectSchema.required?.includes(name),
        defaultValue: def.default,
        options: def.enum,
        component: def.ui?.component,
        attrs: {
          ...(def.ui?.attrs || {}),
          required: objectSchema.required?.includes(name),
        },
      })
    }
  }
  return fields
}

export function transformDotNotationToNested(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split('.')
    let current = result
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!(part in current)) {
        current[part] = {}
      }
      current = current[part]
    }
    const finalKey = parts[parts.length - 1]
    current[finalKey] = value
  }

  return result
}
</script>

<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import { Primitive } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { convertJsonSchemaToZod } from 'zod-from-json-schema'
import { Button } from '@/components/ui/button'
import JSONSchemaFormField from './JSONSchemaFormField.vue'

const props = withDefaults(defineProps<PrimitiveProps & {
  disabled?: boolean
  readonly?: boolean
  schema: Record<string, any>
}>(), {
  as: 'form',
})

const emit = defineEmits<{
  submit: [data: Record<string, any>]
  error: [payload: Record<string, string[] | undefined>]
}>()

const primitiveProps = computed(() => {
  const { disabled, readonly, schema, ...rest } = props

  return rest
})

const objectSchema = computed(() => {
  return (
    props.schema.type === 'object'
      ? props.schema
      : {
          type: 'object',
          properties: { value: props.schema },
          required: ['value'],
        }
  ) as {
    type: 'object'
    required?: string[]
    properties: JSONSchemaObjectProperties
  }
})

const fields = computed(() => fieldsFromJSONSchemaObject(objectSchema.value))

const codeMirrorValueSerializer = {
  serialize: (field: Field, value: unknown) => {
    if (field.type === 'string' || typeof value === 'string') {
      return value
    }
    try {
      return JSON.stringify(value, null, 2)
    }
    catch {
      return String(value)
    }
  },
  deserialize: (field: Field, value: string) => {
    if (field.type === 'string') {
      return value
    }
    try {
      return JSON.parse(value)
    }
    catch {
      return value
    }
  },
}

const fieldsValue = ref<Record<string, any>>({})
const error = ref<Record<string, string[] | undefined>>({})

watch(fields, (value) => {
  error.value = {}
  const newValues: Record<string, any> = {}
  for (const field of value) {
    newValues[field.name] = fieldsValue.value[field.name] !== undefined
      ? fieldsValue.value[field.name] // Keep existing value
      : field.defaultValue !== undefined // Use default value
        ? field.component === 'CodeMirror'
          ? codeMirrorValueSerializer.serialize(field, field.defaultValue)
          : field.defaultValue
        : undefined
  }
  fieldsValue.value = newValues
}, {
  immediate: true,
  deep: true,
})

function validate() {
  const processedFieldValues: Record<string, any> = {}
  for (const field of fields.value) {
    processedFieldValues[field.name] = field.component === 'CodeMirror'
      ? codeMirrorValueSerializer.deserialize(field, fieldsValue.value[field.name])
      : fieldsValue.value[field.name]
  }
  const values = props.schema.type === 'object' ? transformDotNotationToNested(processedFieldValues) : processedFieldValues.value
  const zodSchema = convertJsonSchemaToZod(objectSchema.value)
  const { success, error: validationError } = zodSchema.safeParse(values)
  if (success) {
    error.value = {}
  }
  else {
    error.value = validationError.flatten().fieldErrors
  }

  return {
    valid: Object.keys(error.value).length === 0,
    data: values,
    error: error.value,
  }
}

async function submit(event?: Event) {
  event?.preventDefault()
  const { data, error, valid } = validate()
  if (!valid) {
    emit('error', error)
    return
  }
  emit('submit', data)
}

function setData(value: any, options?: { validate?: boolean }) {
  error.value = {}
  const newValues: Record<string, any> = props.schema.type === 'object' ? value : { value }
  for (const field of fields.value) {
    newValues[field.name] = field.component === 'CodeMirror'
      ? codeMirrorValueSerializer.serialize(field, newValues[field.name])
      : newValues[field.name]
  }
  fieldsValue.value = newValues
  if (options?.validate) {
    validate()
  }
}

defineExpose({ fieldsValue, setData, error, validate, submit })
</script>

<template>
  <Primitive v-bind="primitiveProps" @submit="primitiveProps.as === 'form' ? submit : undefined">
    <JSONSchemaFormField
      v-for="field in fields"
      :key="field.name"
      v-bind="{
        ...field,
        error: error[field.name]?.[0],
        disabled: props.disabled,
        readonly: props.readonly,
        actions: {
          paste: true,
        },
      }"
      v-model="fieldsValue[field.name]"
      class="mb-4"
    />

    <Button v-if="!props.readonly" :disabled="props.disabled" type="submit">
      Submit
    </Button>
  </Primitive>
</template>
