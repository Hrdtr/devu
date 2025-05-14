import type * as routes from '@api/routes'
import type { InferRouterInputs, InferRouterOutputs, RouterClient } from '@orpc/server'
import { createORPCClient, DynamicLink, safe } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { fetch } from '@tauri-apps/plugin-http'
import { createSharedComposable } from '@vueuse/core'
import { ref } from 'vue'

export const useApi = createSharedComposable(() => {
  const state = ref<'pending' | 'ready' | 'error'>('pending')
  const servicePort = ref<number | null>(null)

  const retrieveAPIServicePort = async () => {
    if (servicePort.value) {
      return servicePort.value
    }

    const maxAttempts = 10
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const port = await invoke('get_api_service_port').catch(() => null)
      if (port !== null && !Number.isNaN(Number(port))) {
        servicePort.value = Number(port)
        return Number(port)
      }
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }

    servicePort.value = null
    state.value = 'error'
    console.error('[api] Failed to retrieve API service port.')
    return null
  }

  listen('api-service-port-available', (event) => {
    servicePort.value = null
    state.value = 'pending'
    if (!Number.isNaN(Number(event.payload))) {
      servicePort.value = Number(event.payload)
      console.info('[api] API service running on port:', servicePort.value)
    }
  })

  const waitReady = async () => {
    if (state.value === 'ready') {
      return
    }
    // if (import.meta.env.DEV) {
    //   state.value = 'ready'
    //   return
    // }

    while (state.value === 'pending') {
      console.info('[api] Waiting for \'devu-api\' service to become reachable...')
      const port = await retrieveAPIServicePort()
      const maxAttempts = 10
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (port !== null) {
          const ready = await fetch(`http://localhost:${port}/`)
            .then(response => response.ok)
            .catch(() => false)
          if (ready) {
            state.value = 'ready'
            return
          }
        }
        if (attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, 1000))
        }
      }
    }
    if (state.value === 'error') {
      console.error('[api] Could not reach \'devu-api\'. All retry attempts failed.')
      throw new Error('API service is not available.')
    }
  }

  const $fetch: typeof fetch = async (input, options) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

    const urlValid = (() => {
      try {
        new URL(url) // eslint-disable-line no-new
        return true
      }
      catch {
        return false
      }
    })()
    if (urlValid) {
      return fetch(input, options)
    }

    // if (import.meta.env.DEV) {
    //   return fetch(`http://localhost:3000/api${url.startsWith('/') ? url : `/${url}`}`, options)
    // }

    await waitReady()
    if (!servicePort.value) {
      throw new Error('API service is not available.')
    }
    return fetch(`http://localhost:${servicePort.value}/api${url.startsWith('/') ? url : `/${url}`}`, options)
  }

  const $client: RouterClient<typeof routes> = createORPCClient(
    new DynamicLink(async () => {
      // if (import.meta.env.DEV) {
      //   return new RPCLink({ url: 'http://localhost:3000/rpc', fetch: $fetch })
      // }

      await waitReady()
      if (!servicePort.value) {
        throw new Error('API service is not available.')
      }
      return new RPCLink({ url: `http://localhost:${servicePort.value}/rpc`, fetch: $fetch })
    }),
  )

  return {
    $fetch,
    client: $client,
    safe,
    state,
    servicePort,
    waitReady,
  }
})

export type ApiRouteInput = InferRouterInputs<typeof routes>
export type ApiRouteOutput = InferRouterOutputs<typeof routes>
