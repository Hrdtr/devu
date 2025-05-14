<script setup lang="ts">
import { APIProvider } from '@/components/api-provider'
</script>

<template>
  <Suspense>
    <APIProvider>
      <slot />
    </APIProvider>
  </Suspense>
</template>
