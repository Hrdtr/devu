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
    if (def.type === 'object' && def.properties) {
      fields.push(
        ...fieldsFromJSONSchemaObject({ ...def, type: def.type, properties: def.properties }, fieldNamePrefix ? `${fieldNamePrefix}${name}.` : `${name}.`),
      )
    }
    else {
      fields.push({
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
</script>

<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import { Button } from '@/components/ui/button'
import { toTypedSchema } from '@vee-validate/zod'
import { Primitive } from 'reka-ui'
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import { convertJsonSchemaToZod } from 'zod-from-json-schema'
import JSONSchemaFormField from './JSONSchemaFormField.vue'

const props = withDefaults(defineProps<PrimitiveProps & {
  disabled?: boolean
  readonly?: boolean
  schema: Record<string, any>
}>(), { as: 'form' })

const emit = defineEmits<{
  submit: [payload: Record<string, any>]
  error: [payload: Record<string, any>]
}>()

const primitiveProps = computed(() => {
  const { disabled, readonly, schema, ...rest } = props

  return rest
})

const objectSchema = computed(() => {
  return (props.schema.type === 'object'
    ? props.schema
    : { type: 'object', properties: { value: props.schema }, required: ['value'] }) as {
    type: 'object'
    required?: string[]
    properties: JSONSchemaObjectProperties
  }
})

const fields = computed(() => fieldsFromJSONSchemaObject(objectSchema.value))

function getFieldsInitialValue(schemaProps: typeof objectSchema.value.properties) {
  const fieldsInitialValue: Record<string, any> = {}
  for (const [name, def] of Object.entries(schemaProps)) {
    if (def.type === 'object' && def.properties) {
      fieldsInitialValue[name] = getFieldsInitialValue(def.properties)
    }
    else {
      fieldsInitialValue[name] = def.default
    }
  }
  return fieldsInitialValue
}

const { values, setValues, handleSubmit, errors } = useForm({
  validationSchema: toTypedSchema(convertJsonSchemaToZod(objectSchema.value)),
  initialValues: getFieldsInitialValue(objectSchema.value.properties),
  keepValuesOnUnmount: true,
})

const submit = handleSubmit((formValues) => {
  const values = props.schema.type === 'object' ? formValues : formValues.value
  emit('submit', values)
  return values
}, errors => emit('error', errors))

const error = computed(() => props.schema.type === 'object'
  ? (Object.keys(errors.value).length > 0 ? errors.value : undefined)
  : errors.value.value)

defineExpose({
  value: values,
  setValue: props.schema.type === 'object' ? setValues : (value: any, shouldValidate?: boolean) => setValues({ value }, shouldValidate),
  submit,
  error,
})
</script>

<template>
  <Primitive v-bind="primitiveProps" @submit="primitiveProps.as === 'form' ? submit : undefined">
    <JSONSchemaFormField
      v-for="field in fields"
      :key="field.name"
      v-bind="{ ...field, actions: { paste: true }, disabled: props.disabled, readonly: props.readonly }"
      class="mb-4"
    />

    <Button v-if="!props.readonly" :disabled="props.disabled" type="submit">
      Submit
    </Button>
  </Primitive>
</template>
