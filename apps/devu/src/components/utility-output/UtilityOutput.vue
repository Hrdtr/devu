<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { JSONSchemaObjectProperties } from '../json-schema-form'
import { Primitive } from 'reka-ui'
import { useForm } from 'vee-validate'
import { computed } from 'vue'
import { fieldsFromJSONSchemaObject, JSONSchemaFormField } from '../json-schema-form'

const props = withDefaults(defineProps<PrimitiveProps & {
  schema: Record<string, any>
}>(), { as: 'form' })

const emit = defineEmits<{
  submit: [payload: Record<string, any>]
  error: [payload: Record<string, any>]
}>()

const primitiveProps = computed(() => {
  const { schema, ...rest } = props

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
      v-for="field in fields" :key="field.name"
      v-bind="{ ...field, actions: { copy: true }, readonly: true }" class="mb-4"
    />
  </Primitive>
</template>
