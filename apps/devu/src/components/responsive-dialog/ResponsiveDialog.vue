<script lang="ts" setup>
import type { DialogRootEmits, DialogRootProps } from 'reka-ui'
// import { Drawer } from '@/components/ui/drawer'
import { useMediaQuery } from '@vueuse/core'
import { useForwardPropsEmits } from 'reka-ui'
import { Dialog } from '@/components/ui/dialog'

const props = defineProps<DialogRootProps>()
const emit = defineEmits<DialogRootEmits>()
const forwarded = useForwardPropsEmits(props, emit)

const isDesktop = useMediaQuery('(min-width: 768px)')
</script>

<template>
  <Dialog v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="{ ...slotProps, isDesktop }" />
  </Dialog>
  <!-- <Dialog v-if="isDesktop" v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="{ ...slotProps, isDesktop }" />
  </Dialog>
  <Drawer v-else v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="{ ...slotProps, isDesktop }" />
  </Drawer> -->
</template>
