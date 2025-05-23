import type { Code, Config, EmbedOptions, Playground } from 'livecodes'
import type { MaybeRefOrGetter } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { createPlayground } from 'livecodes'
import { onMounted, readonly, ref, toValue } from 'vue'

export type HeadlessLiveCodesConfig = Partial<Config>
export type HeadlessLiveCodesOptions = Omit<EmbedOptions, 'appUrl' | 'view' | 'template'>

export function useHeadlessLiveCodes(
  config: MaybeRefOrGetter<HeadlessLiveCodesConfig>,
  options?: MaybeRefOrGetter<HeadlessLiveCodesOptions>,
) {
  const instance = ref<Playground>()

  const code = ref<Code>()
  const consoleEntries = ref<{ method: string, args: any[] }[]>([])

  onMounted(async () => {
    instance.value = await createPlayground({
      ...(toValue(options) ?? {}),
      // appUrl: `http://localhost:${servicePort.value}/livecodes`,
      view: 'headless',
    })
    await instance.value.load()
    requestAnimationFrame(() => {
      instance.value?.setConfig(toValue(config))
    })

    code.value = undefined
    instance.value.watch('code', (value) => {
      code.value = value.code
    })
    consoleEntries.value = []
    instance.value.watch('console', (value) => {
      consoleEntries.value.push(value)
    })
  })

  // watch for changes
  watchDebounced(() => toValue(config), async (value) => {
    consoleEntries.value = []
    await instance.value?.setConfig(value)
  }, {
    debounce: 1000,
    deep: true,
  })

  return {
    livecodes: instance,
    $config: readonly(toValue(config)),
    code: readonly(code),
    consoleEntries: readonly(consoleEntries),
  }
}
