<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { Field, JSONSchemaObjectProperties } from '../json-schema-form'
import { Primitive } from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { convertJsonSchemaToZod } from 'zod-from-json-schema'
import { fieldsFromJSONSchemaObject, JSONSchemaFormField, transformDotNotationToNested } from '../json-schema-form'

const props = withDefaults(defineProps<PrimitiveProps & {
  // disabled?: boolean
  // readonly?: boolean
  schema: Record<string, any>
}>(), {
  as: 'form',
})

const emit = defineEmits<{
  submit: [data: Record<string, any>]
  error: [payload: Record<string, string[] | undefined>]
}>()

const primitiveProps = computed(() => {
  const { /* disabled, readonly, */ schema, ...rest } = props

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
  const fieldValues: Record<string, any> = {}
  for (const field of fields.value) {
    fieldValues[field.name] = field.component === 'CodeMirror'
      ? codeMirrorValueSerializer.deserialize(field, fieldsValue.value[field.name])
      : fieldsValue.value[field.name]
  }
  const values = props.schema.type === 'object' ? transformDotNotationToNested(fieldValues) : fieldValues.value
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
        // disabled: props.disabled,
        readonly: true,
        actions: {
          copy: true,
        },
      }"
      v-model="fieldsValue[field.name]"
      class="mb-4"
    />
  </Primitive>
</template>
