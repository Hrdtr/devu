<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLLMChatProfile } from '@/composables/use-llm-chat-profile'
import { toTypedSchema } from '@vee-validate/zod'
import { ErrorMessage, Field, useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'
import { z } from 'zod'

const props = defineProps<{
  update?: typeof _profiles.value[number]
}>()
const emit = defineEmits<{
  created: [profile: typeof _profiles.value[number]]
  updated: [profile: typeof _profiles.value[number]]
}>()

const { profiles: _profiles, createProfile, updateProfile } = useLLMChatProfile()

const providers = ['openai', 'anthropic', 'google-genai', 'ollama']
const provider = ref(props.update && providers.includes(props.update.provider) ? props.update.provider : 'openai')

const providerSpecificShape = {
  'openai': {
    configuration: z.object({
      baseUrl: z.string().optional(),
    }),
    credentials: z.object({
      apiKey: z.string().min(1),
    }),
  },
  'anthropic': {
    configuration: z.object({}).default({}),
    credentials: z.object({
      apiKey: z.string().min(1),
    }),
  },
  'google-genai': {
    configuration: z.object({}).default({}),
    credentials: z.object({
      apiKey: z.string().min(1),
    }),
  },
  'ollama': {
    configuration: z.object({
      baseUrl: z.string().optional(),
    }),
    credentials: z.object({}).default({}),
  },
}
const schema = computed(() => toTypedSchema(z.object({
  name: z.string().min(1),
  model: z.string().min(1),
  additionalSystemPrompt: z.string().nullable().default(null),
  ...providerSpecificShape[provider.value as keyof typeof providerSpecificShape],
})))

const { setValues, handleSubmit, isSubmitting, resetForm } = useForm({
  validationSchema: schema,
  initialValues: props.update,
})

watch(() => props.update, (value) => {
  if (value) {
    provider.value = value.provider
    setValues(value)
  }
})
watch(provider, () => resetForm())

const submit = handleSubmit(async (formValues) => {
  if (props.update) {
    const profile = await updateProfile(props.update.id, { provider: provider.value, ...formValues })
    if (profile) {
      emit('updated', profile)
    }
  }
  else {
    const profile = await createProfile({ provider: provider.value, ...formValues })
    if (profile) {
      emit('created', profile)
    }
  }
}, console.error)
</script>

<template>
  <form @submit="submit">
    <div class="mb-4">
      <Label class="mb-2">Provider</Label>
      <Select v-model="provider" required :disabled="!!props.update">
        <SelectTrigger class="w-full data-[disabled] data-[disabled]:!opacity-100">
          <SelectValue placeholder="Select a provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Providers</SelectLabel>
            <SelectItem v-for="item in providers" :key="item" :value="item">
              {{ item }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div class="mb-4">
      <Field v-slot="{ componentField }" name="name">
        <Label for="name" class="mb-2">Name</Label>
        <Input id="name" v-bind="{ ...componentField, disabled: isSubmitting }" />
        <p class="text-muted-foreground text-sm mt-1.5">
          This name will be used to identify this profile.
        </p>
        <ErrorMessage name="name" class="text-destructive-foreground text-sm mt-1.5" />
      </Field>
    </div>

    <div v-if="['openai', 'ollama'].includes(provider)" class="mb-4">
      <Field v-slot="{ componentField }" name="configuration.baseUrl">
        <Label for="configuration.baseUrl" class="mb-2">Base URL <span
          v-if="provider === 'openai'"
          class="text-muted-foreground"
        >(Optional)</span></Label>
        <Input id="configuration.baseUrl" v-bind="{ ...componentField, disabled: isSubmitting }" />
        <p class="text-muted-foreground text-sm mt-1.5">
          Provider-specific API endpoint base URL.
          {{ provider === 'openai' ? ' Enter a URL here to connect with OpenAI-compatible providers not listed.' : '' }}
        </p>
        <ErrorMessage name="configuration.baseUrl" class="text-destructive-foreground text-sm mt-1.5" />
      </Field>
    </div>

    <div v-if="provider !== 'ollama'" class="mb-4">
      <Field v-slot="{ componentField }" name="credentials.apiKey">
        <Label for="credentials.apiKey" class="mb-2">API Key</Label>
        <Input id="credentials.apiKey" v-bind="{ ...componentField, disabled: isSubmitting, type: 'password' }" />
        <p class="text-muted-foreground text-sm mt-1.5">
          Provider-specific API Key to be used in every requests.
        </p>
        <ErrorMessage name="credentials.apiKey" class="text-destructive-foreground text-sm mt-1.5" />
      </Field>
    </div>

    <div class="mb-4">
      <Field v-slot="{ componentField }" name="model">
        <Label for="model" class="mb-2">Model</Label>
        <Input id="model" v-bind="{ ...componentField, disabled: isSubmitting }" />
        <p class="text-muted-foreground text-sm mt-1.5">
          Provider-specific model id to use.
        </p>
        <ErrorMessage name="model" class="text-destructive-foreground text-sm mt-1.5" />
      </Field>
    </div>

    <div class="mb-4">
      <Field v-slot="{ componentField }" name="additionalSystemPrompt">
        <Label for="additionalSystemPrompt" class="mb-2">Additional System Prompt <span
          class="text-muted-foreground"
        >(Optional)</span></Label>
        <Textarea id="additionalSystemPrompt" v-bind="{ ...componentField, disabled: isSubmitting }" />
        <p class="text-muted-foreground text-sm mt-1.5">
          Provides extra instructions to guide the AI’s behavior or tone during the conversation.
        </p>
        <ErrorMessage name="additionalSystemPrompt" class="text-destructive-foreground text-sm mt-1.5" />
      </Field>
    </div>

    <Button type="submit" class="w-full mt-2">
      Submit
    </Button>
  </form>
</template>
