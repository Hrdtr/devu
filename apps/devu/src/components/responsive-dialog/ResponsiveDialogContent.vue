<script lang="ts" setup>
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import { DialogContent } from '@/components/ui/dialog'
import { DrawerContent } from '@/components/ui/drawer'
import { useMediaQuery } from '@vueuse/core'
import { useForwardPropsEmits } from 'reka-ui'

const props = defineProps<DialogContentProps>()
const emit = defineEmits<DialogContentEmits>()
const forwarded = useForwardPropsEmits(props, emit)

const isDesktop = useMediaQuery('(min-width: 768px)')
</script>

<template>
  <DialogContent v-if="isDesktop" v-slot="slotProps" v-bind="{ ...$attrs, ...forwarded }">
    <slot v-bind="slotProps" />
  </DialogContent>
  <DrawerContent
    v-else
    v-slot="slotProps"
    class="p-5 pt-0 gap-4"
    v-bind="{ ...$attrs, ...forwarded }"
  >
    <slot v-bind="slotProps" />
  </DrawerContent>
</template>
