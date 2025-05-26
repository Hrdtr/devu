import type { Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { check as $check } from '@tauri-apps/plugin-updater'
import { createSharedComposable } from '@vueuse/core'
import { onMounted, ref } from 'vue'

export const useUpdater = createSharedComposable(() => {
  const pending = ref(false)
  const data = ref<Update | null>(null)
  const error = ref<Error | null>(null)

  const downloaded = ref<number | undefined>()
  const contentLength = ref<number | undefined>()

  const check = async () => {
    if (import.meta.env.DEV) {
      return
    }
    pending.value = true
    console.info('[updater] Checking for updates')
    await $check()
      .then((result) => {
        console.info(
          `[updater] ${
            result
              ? `Update available: ${result.version}`
              : '[updater] No update available'
          }`,
        )
        data.value = result
      })
      .catch((e) => {
        console.error('[updater] Error while checking for updates', e)
        error.value = e
      })
      .finally(() => (pending.value = false))
  }

  onMounted(check)

  const downloadAndInstall = async () => {
    if (pending.value || !data.value) {
      return
    }
    try {
      pending.value = true
      await data.value.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength.value = event.data.contentLength
            console.info(`[updater] Started downloading ${event.data.contentLength} bytes`)
            break
          case 'Progress':
            if (downloaded.value === undefined) {
              downloaded.value = 0
            }
            downloaded.value += event.data.chunkLength
            console.info(`[updater] Downloaded ${downloaded.value} from ${contentLength.value}`)
            break
          case 'Finished':
            console.info('[updater] Download finished')
            break
        }
      })
    }
    catch (e) {
      console.error('[updater] Error during download and install', e)
      error.value = e as Error
      throw e // Re-throw so the caller can handle it
    }
    finally {
      pending.value = false
    }
  }

  return {
    pending,
    data,
    error,
    downloaded,
    contentLength,
    check,
    downloadAndInstall,
    relaunch,
  }
})
