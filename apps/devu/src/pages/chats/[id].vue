<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLLMChatState } from '@/composables/use-llm-chat-state'

const route = useRoute()
const router = useRouter()

const { chatId } = useLLMChatState()

onBeforeMount(() => {
  chatId.value = route.params.id ? String(route.params.id) : undefined
  router.replace(`/`)
})
</script>
