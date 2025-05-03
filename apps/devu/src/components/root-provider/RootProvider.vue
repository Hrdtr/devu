<script setup lang="ts">
import { APIProvider } from '@/components/api-provider'
import { LLMChatDBProvider } from '@/components/llm-chat'
</script>

<template>
  <Suspense>
    <APIProvider>
      <LLMChatDBProvider>
        <slot />
      </LLMChatDBProvider>
    </APIProvider>
  </Suspense>
</template>
