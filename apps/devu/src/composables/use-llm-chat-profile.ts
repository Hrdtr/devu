import type { Profile } from './use-llm-chat-db'
import { createSharedComposable, useDebounceFn } from '@vueuse/core'
import { computed, watch } from 'vue'
import { useLLMChatDB } from './use-llm-chat-db'

export function _useLLMChatProfiles() {
  const { createId, liveQuery, db } = useLLMChatDB()

  const { rows } = liveQuery.sql<Profile>`SELECT * FROM profiles`

  const profiles = computed(() => rows.value || [])

  const createDefaultProfile = useDebounceFn(() => {
    return createProfile({
      name: 'Ollama - Llama 3.2:3B',
      provider: 'ollama',
      configuration: {
        baseUrl: 'http://localhost:11434',
      },
      credentials: {},
      model: 'llama3.2:3b',
      additional_system_prompt: null,
    })
  })

  watch(profiles, (value) => {
    if (value.length === 0) {
      createDefaultProfile()
    }
  })

  async function createProfile({
    name,
    provider,
    configuration,
    credentials,
    model,
    additional_system_prompt,
  }: Omit<Profile, 'id' | 'created_at' | 'last_updated_at'>) {
    const id = createId()
    const profile = await db.sql<Profile>`
      INSERT INTO profiles (id, name, provider, configuration, credentials, model, additional_system_prompt)
      VALUES (${id}, ${name}, ${provider}, ${configuration}, ${credentials}, ${model}, ${additional_system_prompt})
      RETURNING *`.then(({ rows }) => rows[0])

    return profile
  }

  async function updateProfile(
    id: string,
    {
      name,
      provider,
      configuration,
      credentials,
      model,
      additional_system_prompt,
    }: Omit<Profile, 'id' | 'created_at' | 'last_updated_at'>,
  ): Promise<Profile> {
    const profile = await db.sql<Profile>`
      UPDATE profiles SET last_updated_at = ${new Date()}, name = ${name}, provider = ${provider}, configuration = ${configuration}, credentials = ${credentials}, model = ${model}, additional_system_prompt = ${additional_system_prompt}
      WHERE id = ${id}
      RETURNING *`.then(({ rows }) => rows[0])

    return profile
  }

  async function deleteProfile(id: string) {
    await db.sql`DELETE FROM profiles WHERE id = ${id}`
    return { id }
  }

  return {
    profiles,
    createProfile,
    updateProfile,
    deleteProfile,
  }
}

export const useLLMChatProfiles = createSharedComposable(_useLLMChatProfiles)
