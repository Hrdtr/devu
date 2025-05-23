<script lang="ts" setup>
import { DialogFooter } from '@/components/ui/dialog'
// import { DrawerFooter } from '@/components/ui/drawer'
// import { useMediaQuery } from '@vueuse/core'

// const isDesktop = useMediaQuery('(min-width: 768px)')
</script>

<template>
  <DialogFooter v-slot="slotProps" v-bind="{ ...$attrs }">
    <slot v-bind="slotProps" />
  </DialogFooter>
  <!-- <DialogFooter v-if="isDesktop" v-slot="slotProps" v-bind="{ ...$attrs }">
    <slot v-bind="slotProps" />
  </DialogFooter>
  <DrawerFooter
    v-else
    v-slot="slotProps"
    class="p-0"
    v-bind="{ ...$attrs }"
  >
    <slot v-bind="slotProps" />
  </DrawerFooter> -->
</template>
