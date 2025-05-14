import type { ApiRouteInput, ApiRouteOutput } from './use-api'
import { createSharedComposable } from '@vueuse/core'
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { useApi } from './use-api'

export function _useLLMChatProfile() {
  const { client, safe } = useApi()

  const profileState = ref<'idle' | 'loading' | 'pending'>('idle')

  const profiles = ref<ApiRouteOutput['llmChat']['profile']['list']['data']>([])

  const loadProfiles = async () => {
    if (profileState.value !== 'idle') {
      return
    }
    profileState.value = 'loading'
    const { data, error } = await safe(client.llmChat.profile.list({ limit: -1 }))
    if (error) {
      toast.error(error?.message || String(error))
      profileState.value = 'idle'
      return
    }
    profiles.value = data.data
    profileState.value = 'idle'
  }
  onMounted(loadProfiles)

  async function createProfile(payload: ApiRouteInput['llmChat']['profile']['create']) {
    if (profileState.value !== 'idle') {
      return
    }
    profileState.value = 'pending'
    const { data, error } = await safe(client.llmChat.profile.create(payload))
    if (error) {
      toast.error(error?.message || String(error))
      profileState.value = 'idle'
      return
    }

    profiles.value = [data, ...profiles.value]
    profileState.value = 'idle'
    return data
  }

  async function updateProfile(id: string, payload: Omit<ApiRouteInput['llmChat']['profile']['update'], 'id'>) {
    if (profileState.value !== 'idle') {
      return
    }
    profileState.value = 'pending'
    const { data, error } = await safe(client.llmChat.profile.update({ id, ...payload }))
    if (error) {
      toast.error(error?.message || String(error))
      profileState.value = 'idle'
      return
    }

    profiles.value = profiles.value.map(profile => profile.id === id ? data : profile)
    profileState.value = 'idle'
    return data
  }

  async function deleteProfile(id: string) {
    if (profileState.value !== 'idle') {
      return
    }
    profileState.value = 'pending'
    const { error } = await safe(client.llmChat.profile.delete({ id }))
    if (error) {
      toast.error(error?.message || String(error))
      profileState.value = 'idle'
      return
    }

    profiles.value = profiles.value.filter(profile => profile.id !== id)
    profileState.value = 'idle'
    return { id }
  }

  return {
    profileState,
    profiles,
    loadProfiles,
    createProfile,
    updateProfile,
    deleteProfile,
  }
}
export const useLLMChatProfile = createSharedComposable(_useLLMChatProfile)
