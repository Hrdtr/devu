<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener'
import { toTypedSchema } from '@vee-validate/zod'
import { ErrorMessage, Field, useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLLMChatProfile } from '@/composables/use-llm-chat-profile'

const props = defineProps<{
  update?: typeof _profiles.value[number]
}>()
const emit = defineEmits<{
  created: [profile: typeof _profiles.value[number]]
  updated: [profile: typeof _profiles.value[number]]
}>()

const { profiles: _profiles, createProfile, updateProfile } = useLLMChatProfile()

const providers = [
  { id: 'anthropic', name: 'Anthropic', modelListRefUrl: 'https://docs.anthropic.com/en/docs/about-claude/models/overview', apiKeyRefUrl: 'https://console.anthropic.com/settings/keys' },
  { id: 'cohere', name: 'Cohere', modelListRefUrl: 'https://docs.cohere.com/v2/docs/models', apiKeyRefUrl: 'https://dashboard.cohere.com/api-keys' },
  { id: 'deepseek', name: 'Cohere', modelListRefUrl: 'https://api-docs.deepseek.com/quick_start/pricing', apiKeyRefUrl: 'https://platform.deepseek.com/api_keys' },
  { id: 'google-generative-ai', name: 'Google Generative AI', modelListRefUrl: 'https://ai.google.dev/gemini-api/docs/models', apiKeyRefUrl: 'https://aistudio.google.com/apikey' },
  { id: 'mistralai', name: 'MistralAI', modelListRefUrl: 'https://docs.mistral.ai/getting-started/models/models_overview', apiKeyRefUrl: 'https://console.mistral.ai/api-keys' },
  { id: 'openai', name: 'OpenAI', modelListRefUrl: 'https://platform.openai.com/docs/models', apiKeyRefUrl: 'https://platform.openai.com/settings/organization/api-keys' },
  { id: 'xai', name: 'xAI', modelListRefUrl: 'https://docs.x.ai/docs/models', apiKeyRefUrl: 'https://console.x.ai/team/default/api-keys' },
  { id: 'ollama', name: 'Ollama', modelListRefUrl: undefined, apiKeyRefUrl: undefined },
]
const provider = ref(props.update && providers.map(p => p.id).includes(props.update.provider) ? props.update.provider : 'anthropic')

const providerSpecificShape = {
  'anthropic': {
    configuration: z.object({}).default({}),
    credentials: z.object({
      apiKey: z.string().min(1),
    }),
  },
  'cohere': {
    configuration: z.object({}).default({}),
    credentials: z.object({
      apiKey: z.string().min(1),
    }),
  },
  'google-generative-ai': {
    configuration: z.object({}).default({}),
    credentials: z.object({
      apiKey: z.string().min(1),
    }),
  },
  'groq': {
    configuration: z.object({}).default({}),
    credentials: z.object({
      apiKey: z.string().min(1),
    }),
  },
  'mistralai': {
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
  'openai': {
    configuration: z.object({
      baseUrl: z.string().optional(),
    }),
    credentials: z.object({
      apiKey: z.string().min(1),
    }),
  },
  'xai': {
    configuration: z.object({}).default({}),
    credentials: z.object({
      apiKey: z.string().min(1),
    }),
  },
}
const schema = computed(() => toTypedSchema(z.object({
  name: z.string().min(1),
  model: z.string().min(1),
  additionalSystemPrompt: z.string().nullable().default(null),
  ...providerSpecificShape[provider.value as keyof typeof providerSpecificShape],
})))

const { setValues, setFieldValue, handleSubmit, isSubmitting, resetForm } = useForm({
  validationSchema: schema,
  initialValues: props.update,
})

watch(() => props.update, (value) => {
  if (value) {
    provider.value = value.provider
    setValues(value)
  }
})
watch(provider, (value) => {
  resetForm()
  if (value === 'ollama') {
    setFieldValue('configuration.baseUrl', 'http://localhost:11434')
  }
})

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
            <SelectItem v-for="item in providers" :key="item.id" :value="item.id">
              {{ item.name }}
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div class="mb-4">
      <Field v-slot="{ componentField }" name="name">
        <Label for="name" class="mb-2">Name</Label>
        <Input id="name" v-bind="{ ...componentField, disabled: isSubmitting }" autocorrect="off" />
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
        <Input id="configuration.baseUrl" v-bind="{ ...componentField, disabled: isSubmitting }" autocorrect="off" />
        <p v-if="provider === 'openai'" class="text-muted-foreground text-sm mt-1.5">
          API endpoint base URL. You can use this field to connect with other OpenAI-compatible providers.
        </p>
        <p v-if="provider === 'ollama'" class="text-muted-foreground text-sm mt-1.5">
          Ollama server endpoint.
        </p>
        <ErrorMessage name="configuration.baseUrl" class="text-destructive-foreground text-sm mt-1.5" />
      </Field>
    </div>

    <div v-if="provider !== 'ollama'" class="mb-4">
      <Field v-slot="{ componentField }" name="credentials.apiKey">
        <Label for="credentials.apiKey" class="mb-2">API Key</Label>
        <Input id="credentials.apiKey" v-bind="{ ...componentField, disabled: isSubmitting, type: 'password' }" autocorrect="off" />
        <p class="text-muted-foreground text-sm mt-1.5">
          Fill with your<span v-if="providers.find(p => p.id === provider)?.apiKeyRefUrl">&nbsp;</span><a
            v-if="providers.find(p => p.id === provider)?.apiKeyRefUrl"
            class="underline"
            :href="providers.find(p => p.id === provider)!.apiKeyRefUrl!"
            target="_blank"
            rel="noopener noreferrer"
            @click.prevent="openUrl(providers.find(p => p.id === provider)!.apiKeyRefUrl!)"
          >{{ providers.find(p => p.id === provider)!.name }} API key</a>.
        </p>
        <ErrorMessage name="credentials.apiKey" class="text-destructive-foreground text-sm mt-1.5" />
      </Field>
    </div>

    <div class="mb-4">
      <Field v-slot="{ componentField }" name="model">
        <Label for="model" class="mb-2">Model</Label>
        <Input id="model" v-bind="{ ...componentField, disabled: isSubmitting }" autocorrect="off" />
        <p v-if="provider !== 'ollama'" class="text-muted-foreground text-sm mt-1.5">
          Enter a model identifier{{ provider !== 'ollama' ? ' found in the' : '' }}<span v-if="providers.find(p => p.id === provider)?.modelListRefUrl">&nbsp;</span><a
            v-if="providers.find(p => p.id === provider)?.modelListRefUrl"
            class="underline"
            :href="providers.find(p => p.id === provider)!.modelListRefUrl!"
            target="_blank"
            rel="noopener noreferrer"
            @click.prevent="openUrl(providers.find(p => p.id === provider)!.modelListRefUrl!)"
          >{{ providers.find(p => p.id === provider)!.name }} model list</a>.
        </p>
        <p v-if="provider === 'ollama'" class="text-muted-foreground text-sm mt-1.5">
          Enter the Ollama model name to use. Make sure the model is already pulled.
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
