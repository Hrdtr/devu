<script setup lang="ts">
import { useApi } from '@/composables/use-api'

const { waitReady } = useApi()
await waitReady()
</script>

<template>
  <slot />
</template>
