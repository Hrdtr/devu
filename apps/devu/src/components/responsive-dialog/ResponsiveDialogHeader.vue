<script lang="ts" setup>
import { DialogHeader } from '@/components/ui/dialog'
import { DrawerHeader } from '@/components/ui/drawer'
import { useMediaQuery } from '@vueuse/core'

const isDesktop = useMediaQuery('(min-width: 768px)')
</script>

<template>
  <DialogHeader v-if="isDesktop" v-slot="slotProps" v-bind="{ ...$attrs }">
    <slot v-bind="slotProps" />
  </DialogHeader>
  <DrawerHeader v-else v-slot="slotProps" class="p-0" v-bind="{ ...$attrs }">
    <slot v-bind="slotProps" />
  </DrawerHeader>
</template>
