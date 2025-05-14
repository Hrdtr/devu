<script setup lang="ts">
import type { useLLMChatMessages } from '@/composables/use-llm-chat-messages'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{
  chatId: string
  message: ReturnType<typeof useLLMChatMessages>['messages']['value']['data'][number]
  disabled?: boolean
  getAvailableBranches: ReturnType<typeof useLLMChatMessages>['getAvailableBranches']
}>()
const emit = defineEmits<{
  switchToBranch: [branch: string]
}>()

const parentId = computed(() => props.message.parentId)
const branch = computed(() => props.message.branch)

const branches = ref<Awaited<ReturnType<typeof props.getAvailableBranches>>>([])
onMounted(() => {
  if (!props.message.parentId) {
    return
  }
  props.getAvailableBranches(props.message.parentId).then((res) => {
    branches.value = res.reverse()
  })
})
</script>

<template>
  <div v-if="branches.length > 1 && parentId" class="flex flex-row items-center">
    <Button
      variant="ghost"
      size="icon"
      class="size-8 !p-0"
      :disabled="props.disabled || branches.indexOf(branch) === 0"
      @click="emit('switchToBranch', branches[branches.indexOf(branch) - 1])"
    >
      <ChevronLeft class="size-4" />
    </Button>

    <span class="text-sm mx-1">{{ !branches.includes(branch) ? '...' : branches.indexOf(branch) + 1 }}/{{
      branches.length }}</span>

    <Button
      variant="ghost"
      size="icon"
      class="size-8 !p-0"
      :disabled="props.disabled || branches.indexOf(branch) === (branches.length - 1)"
      @click="emit('switchToBranch', branches[branches.indexOf(branch) + 1])"
    >
      <ChevronRight class="size-4" />
    </Button>
  </div>
</template>
