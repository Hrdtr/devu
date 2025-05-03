import type { ClientOptions } from '@tauri-apps/plugin-http'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { fetch } from '@tauri-apps/plugin-http'
import { createSharedComposable } from '@vueuse/core'
import { ref } from 'vue'

export const useApi = createSharedComposable(() => {
  const state = ref<'pending' | 'ready' | 'error'>('pending')
  const sidecarPort = ref<number | null>(null)

  const MAX_RETRIES = 10
  const RETRY_DELAY = 1_000 // ms
  const retrieveSidecarPort = async () => {
    if (state.value === 'ready') {
      return sidecarPort.value
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const port = await invoke('get_sidecar_port').catch(() => null)
      if (port !== null && !Number.isNaN(Number(port))) {
        sidecarPort.value = Number(port)
        state.value = 'ready'
        return Number(port)
      }
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY))
      }
    }

    sidecarPort.value = null
    state.value = 'error'
    console.error('[api] Failed to retrieve sidecar service port.')
    return null
  }

  listen('sidecar-port-available', (event) => {
    sidecarPort.value = null
    state.value = 'pending'
    console.info('[api] sidecar service running on port:', event.payload)
    if (!Number.isNaN(Number(event.payload))) {
      sidecarPort.value = Number(event.payload)
      state.value = 'ready'
    }
  })

  const request = async (
    path: string,
    options?: RequestInit & ClientOptions,
  ): Promise<Response> => {
    const port = await retrieveSidecarPort()
    if (!port) {
      throw new Error('API service is not available.')
    }
    return fetch(`http://localhost:${sidecarPort.value}${path}`, options)
  }

  const waitReady = async () => {
    while (state.value === 'pending') {
      console.info(
        '[api] Waiting for \'devu-api\' sidecar service to become reachable...',
      )
      await retrieveSidecarPort()
    }
    if (state.value === 'error') {
      console.error(
        '[api] Could not reach \'devu-api\' sidecar. All retry attempts failed.',
      )
      throw new Error('API service is not available.')
    }
  }

  return {
    fetch: request,
    state,
    sidecarPort,
    waitReady,
  }
})
