<script setup lang="ts">
import { openUrl } from '@tauri-apps/plugin-opener'
import { useElementBounding } from '@vueuse/core'
import { Info } from 'lucide-vue-next'
import { onActivated, onDeactivated, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { codePlaygrounds } from '@/composables/use-code-playground'
import { usePageMeta } from '@/composables/use-page-meta'

const route = useRoute()
const router = useRouter()

const activated = ref(false)
onActivated(() => (activated.value = true))
onDeactivated(() => (activated.value = false))
watch(() => route.fullPath, () => (activated.value = false))

const { title } = usePageMeta()

const playground = codePlaygrounds.find(i => i.id === route.path.split('/').pop())
if (!playground) {
  router.replace('/')
}
onMounted(async () => {
  title.value = playground ? `Playground: ${playground.name}` : undefined
})
onActivated(() => {
  title.value = playground ? `Playground: ${playground.name}` : undefined
})

const wrapperRef = useTemplateRef('wrapper')
const { width: wrapperWidth } = useElementBounding(wrapperRef)
</script>

<template>
  <Teleport v-if="activated" to="#header-end">
    <div class="flex flex-row items-center -mr-2">
      <Button
        variant="ghost"
        size="icon"
        class="w-8 h-8"
        @click="() => {
          if (playground) {
            openUrl(playground.referenceUrl)
          }
        }"
      >
        <Info />
        <span class="sr-only">Reference</span>
      </Button>
    </div>
  </Teleport>
  <div ref="wrapper" class="w-full h-full">
    <slot v-bind="{ activated, playground, wrapperWidth }" />
  </div>
</template>
