<script lang="ts" setup>
import type { DialogTitleProps } from 'reka-ui'
import { DialogTitle } from '@/components/ui/dialog'
import { DrawerTitle } from '@/components/ui/drawer'
import { useMediaQuery } from '@vueuse/core'
import { useForwardPropsEmits } from 'reka-ui'

const props = defineProps<DialogTitleProps>()
const forwarded = useForwardPropsEmits(props)

const isDesktop = useMediaQuery('(min-width: 768px)')
</script>

<template>
  <DialogTitle v-if="isDesktop" v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DialogTitle>
  <DrawerTitle v-else v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DrawerTitle>
</template>
