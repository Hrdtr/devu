<script setup lang="ts">
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSettingsAppearance } from '@/composables/use-settings-appearance'

const { theme, motion, scale } = useSettingsAppearance()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="col-span-2 flex flex-col gap-2">
        <h3 class="font-semibold">
          Theme
        </h3>
        <p class="text-sm text-muted-foreground">
          Choose between light, dark, or automatic theme based on your system settings.
        </p>
      </div>
      <div class="flex flex-col items-end">
        <Select v-model="theme">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="bottom" align="end">
            <SelectGroup>
              <SelectLabel>Theme</SelectLabel>
              <SelectItem value="light">
                Light
              </SelectItem>
              <SelectItem value="dark">
                Dark
              </SelectItem>
              <SelectItem value="auto">
                System
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="col-span-2 flex flex-col gap-2">
        <h3 class="font-semibold">
          Scale
        </h3>
        <p class="text-sm text-muted-foreground">
          Adjust the overall size of text and UI elements across the app.
        </p>
      </div>
      <div class="flex flex-col items-end">
        <Select v-model="scale">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="bottom" align="end">
            <SelectGroup>
              <SelectLabel>Scale</SelectLabel>
              <SelectItem :value="0.9">
                90%
              </SelectItem>
              <SelectItem :value="0.95">
                95%
              </SelectItem>
              <SelectItem :value="1">
                100%
              </SelectItem>
              <SelectItem :value="1.05">
                105%
              </SelectItem>
              <SelectItem :value="1.1">
                110%
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-4 mb-4">
      <div class="col-span-2 flex flex-col gap-2">
        <h3 class="font-semibold">
          Motion/Animation Preference
        </h3>
        <p class="text-sm text-muted-foreground">
          Control how much motion is used in the UI. Reduce animations for accessibility or personal comfort.
        </p>
      </div>
      <div class="flex flex-col items-end">
        <Select v-model="motion">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="bottom" align="end">
            <SelectGroup>
              <SelectLabel>Motion/Animation Preference</SelectLabel>
              <SelectItem value="system">
                System
              </SelectItem>
              <SelectItem value="reduced">
                Reduced
              </SelectItem>
              <SelectItem value="default">
                Default
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
</template>
