import { createGlobalState, useColorMode, useLocalStorage } from '@vueuse/core'

export const useSettingsAppearance = createGlobalState(() => {
  const { store: theme } = useColorMode()
  const scale = useLocalStorage('settings:appearance.scale', 1)
  const motion = useLocalStorage<'system' | 'reduced' | 'default'>('settings:appearance.motion', 'system')

  return {
    theme,
    scale,
    motion,
  }
})
