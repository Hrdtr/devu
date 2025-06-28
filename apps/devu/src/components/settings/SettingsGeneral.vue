<script setup lang="ts">
import { disable as autostartDisable, enable as autostartEnable, isEnabled as autostartIsEnabled } from '@tauri-apps/plugin-autostart'
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useCodePlayground } from '@/composables/use-code-playground'
import { useSettingsGeneral } from '@/composables/use-settings-general'
import { useUtility } from '@/composables/use-utilities'

const { launchOnStartup, defaultView } = useSettingsGeneral()

const launchOnStartupCheckError = ref<any | null>(null)
onMounted(async () => {
  try {
    console.info('Checking autostart status...')
    launchOnStartup.value = await autostartIsEnabled()
    console.info(`Autostart status: ${launchOnStartup.value ? ' enabled.' : ' disabled.'}`)
  }
  catch (error) {
    console.error('Failed to check autostart status:', error)
    launchOnStartupCheckError.value = error
    toast.error('Failed to check autostart status.')
  }
})

const toggleAutostartPending = ref(false)
async function toggleAutostart(enabled: boolean) {
  toggleAutostartPending.value = true
  try {
    launchOnStartup.value = enabled
    if (enabled) {
      console.info('Enabling autostart...')
      await autostartEnable()
    }
    else {
      console.info('Disabling autostart...')
      await autostartDisable()
    }
    launchOnStartup.value = await autostartIsEnabled()
    console.info(`Autostart status: ${launchOnStartup.value ? ' enabled.' : ' disabled.'}`)
    toggleAutostartPending.value = false
  }
  catch (error) {
    console.error('Failed to update autostart status:', error)
    toast.error('Failed to update autostart status.')
    toggleAutostartPending.value = false
  }
}

const { utilities } = useUtility()
const { codePlaygrounds } = useCodePlayground()

const defaultViewOptions = computed(() => [
  { label: 'Chat', value: '/' },
  { label: 'Utilities', value: `/utilities/${utilities.value[0]?.id}` },
  { label: 'Code Snippets', value: '/code-snippets/new' },
  { label: 'Code Playground', value: `/code-playgrounds/${codePlaygrounds.value[0]?.id}` },
])
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="col-span-2 flex flex-col gap-2">
        <h3 class="font-medium">
          Launch Devu automatically on system startup
        </h3>
        <p class="text-sm text-muted-foreground">
          Enable this to start Devu when you log in to your computer.
        </p>
      </div>
      <div class="flex flex-col items-end py-1">
        <Switch
          id="launch-on-startup"
          :disabled="toggleAutostartPending"
          :checked="launchOnStartup"
          @update:checked="toggleAutostart"
        />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="col-span-2 flex flex-col gap-2">
        <h3 class="font-medium">
          Default View on Startup
        </h3>
        <p class="text-sm text-muted-foreground">
          Choose which tool or section Devu opens when it starts.
        </p>
      </div>
      <div class="flex flex-col items-end">
        <Select v-model="defaultView">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="bottom" align="end">
            <SelectGroup>
              <SelectLabel>Tools</SelectLabel>
              <SelectItem v-for="option in defaultViewOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
</template>
