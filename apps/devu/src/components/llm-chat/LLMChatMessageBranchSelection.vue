<script setup lang="ts">
import type { useLLMChatMessages } from '@/composables/use-llm-chat-messages'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  chatId: string
  message: ReturnType<typeof useLLMChatMessages>['messages']['value'][number]
  disabled?: boolean
  getAvailableBranches: ReturnType<typeof useLLMChatMessages>['getAvailableBranches']
}>()
const emit = defineEmits<{
  switchBranch: Parameters<ReturnType<typeof useLLMChatMessages>['switchBranch']>
}>()

const parentId = computed(() => props.message.parent_id)
const branchId = computed(() => props.message.branch_id)

const branches = ref<Awaited<ReturnType<typeof props.getAvailableBranches>>>([])
watch([() => props.message.id, parentId, branchId], ([_, parentId]) => {
  if (!parentId) {
    return
  }
  props.getAvailableBranches(parentId).then((res) => {
    branches.value = res.reverse()
  })
}, { immediate: true, deep: true })
</script>

<template>
  <div v-if="branches.length > 1 && parentId" class="flex flex-row items-center">
    <Button
      variant="ghost" size="icon" class="size-8 !p-0"
      :disabled="props.disabled || branches.indexOf(branchId) === 0"
      @click="emit('switchBranch', parentId, branches[branches.indexOf(branchId) - 1])"
    >
      <ChevronLeft class="size-4" />
    </Button>

    <span class="text-sm mx-1">{{ !branches.includes(branchId) ? '...' : branches.indexOf(branchId) + 1 }}/{{
      branches.length }}</span>

    <Button
      variant="ghost" size="icon" class="size-8 !p-0"
      :disabled="props.disabled || branches.indexOf(branchId) === (branches.length - 1)"
      @click="emit('switchBranch', parentId, branches[branches.indexOf(branchId) + 1])"
    >
      <ChevronRight class="size-4" />
    </Button>
  </div>
</template>
