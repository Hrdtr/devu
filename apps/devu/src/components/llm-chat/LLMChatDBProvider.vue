<script setup lang="ts">
import { useLLMChatDB } from '@/composables/use-llm-chat-db'

const { db, provide } = await useLLMChatDB.initialize()
provide(db)
</script>

<template>
  <slot />
</template>
