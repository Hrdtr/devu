<script lang="ts" setup>
import type { DialogCloseProps } from 'reka-ui'
// import { DrawerClose } from '@/components/ui/drawer'
// import { useMediaQuery } from '@vueuse/core'
import { useForwardPropsEmits } from 'reka-ui'
import { DialogClose } from '@/components/ui/dialog'

const props = defineProps<DialogCloseProps>()
const forwarded = useForwardPropsEmits(props)

// const isDesktop = useMediaQuery('(min-width: 768px)')
</script>

<template>
  <DialogClose v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DialogClose>
  <!-- <DialogClose v-if="isDesktop" v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DialogClose>
  <DrawerClose v-else v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DrawerClose> -->
</template>
