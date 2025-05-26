import { createGlobalState, useLocalStorage } from '@vueuse/core'

export const useSettingsGeneral = createGlobalState(() => {
  const launchOnStartup = useLocalStorage('settings:general.launch-on-startup', false)
  const defaultView = useLocalStorage('settings:general.default-view', '/')

  return {
    launchOnStartup,
    defaultView,
  }
})
