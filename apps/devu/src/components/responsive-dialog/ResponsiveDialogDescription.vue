<script lang="ts" setup>
import type { DialogDescriptionProps } from 'reka-ui'
// import { DrawerDescription } from '@/components/ui/drawer'
// import { useMediaQuery } from '@vueuse/core'
import { useForwardPropsEmits } from 'reka-ui'
import { DialogDescription } from '@/components/ui/dialog'

const props = defineProps<DialogDescriptionProps>()
const forwarded = useForwardPropsEmits(props)

// const isDesktop = useMediaQuery('(min-width: 768px)')
</script>

<template>
  <DialogDescription v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DialogDescription>
  <!-- <DialogDescription v-if="isDesktop" v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DialogDescription>
  <DrawerDescription v-else v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DrawerDescription> -->
</template>
