<script lang="ts" setup>
import { DialogHeader } from '@/components/ui/dialog'
import { cn } from '@/utils'
// import { DrawerHeader } from '@/components/ui/drawer'
// import { useMediaQuery } from '@vueuse/core'

// const isDesktop = useMediaQuery('(min-width: 768px)')
</script>

<template>
  <DialogHeader
    v-slot="slotProps"
    v-bind="{ ...$attrs, class: undefined }"
    :class="cn('text-left', ($attrs.class ?? ''))"
  >
    <slot v-bind="slotProps" />
  </DialogHeader>
  <!-- <DialogHeader v-if="isDesktop" v-slot="slotProps" v-bind="{ ...$attrs }">
    <slot v-bind="slotProps" />
  </DialogHeader>
  <DrawerHeader
    v-else
    v-slot="slotProps"
    class="p-0"
    v-bind="{ ...$attrs }"
  >
    <slot v-bind="slotProps" />
  </DrawerHeader> -->
</template>
