<script lang="ts" setup>
import type { DialogOverlayProps } from 'reka-ui'
// import { DrawerOverlay } from '@/components/ui/drawer'
// import { useMediaQuery } from '@vueuse/core'
import { useForwardPropsEmits } from 'reka-ui'
import { DialogOverlay } from '@/components/ui/dialog'

const props = defineProps<DialogOverlayProps>()
const forwarded = useForwardPropsEmits(props)

// const isDesktop = useMediaQuery('(min-width: 768px)')
</script>

<template>
  <DialogOverlay v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DialogOverlay>
  <!-- <DialogOverlay v-if="isDesktop" v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DialogOverlay>
  <DrawerOverlay v-else v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DrawerOverlay> -->
</template>
