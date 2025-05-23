<script lang="ts" setup>
import type { DialogTriggerProps } from 'reka-ui'
// import { DrawerTrigger } from '@/components/ui/drawer'
// import { useMediaQuery } from '@vueuse/core'
import { useForwardPropsEmits } from 'reka-ui'
import { DialogTrigger } from '@/components/ui/dialog'

const props = defineProps<DialogTriggerProps>()
const forwarded = useForwardPropsEmits(props)

// const isDesktop = useMediaQuery('(min-width: 768px)')
</script>

<template>
  <DialogTrigger v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DialogTrigger>
  <!-- <DialogTrigger v-if="isDesktop" v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DialogTrigger>
  <DrawerTrigger v-else v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DrawerTrigger> -->
</template>
