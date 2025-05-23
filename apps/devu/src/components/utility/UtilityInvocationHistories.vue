<script setup lang="ts">
import type { ApiRouteOutput } from '@/composables/use-api'
import { useInfiniteScroll, watchDebounced } from '@vueuse/core'
import { X } from 'lucide-vue-next'
import { ListboxContent, ListboxItem, ListboxRoot, ListboxVirtualizer } from 'reka-ui'
import { onMounted, ref, useTemplateRef } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useApi } from '@/composables/use-api'

const props = defineProps<{
  utility: string
}>()
const emit = defineEmits<{
  restore: [data: NonNullable<typeof histories.value>['data'][number]]
}>()

const { client, safe } = useApi()

const scrollElementRef = useTemplateRef('scrollElement')
const search = ref('')
const histories = ref<ApiRouteOutput['utility']['invocationHistories']['list']>()

async function fetchInvocationHistories() {
  const { data, error } = await safe(client.utility.invocationHistories.list({
    utility: props.utility,
    search: search.value || undefined,
  }))
  if (error) {
    toast.error(error?.message || String(error))
    return
  }
  histories.value = data
}
onMounted(fetchInvocationHistories)
watchDebounced(search, fetchInvocationHistories, { debounce: 500 })

useInfiniteScroll(() => scrollElementRef.value?.$el, async () => {
  if (!histories.value?.nextCursor) {
    return
  }
  const { data, error } = await safe(client.utility.invocationHistories.list({
    utility: props.utility,
    search: search.value || undefined,
    cursor: histories.value.nextCursor,
  }))
  if (error) {
    toast.error(error?.message || String(error))
    return
  }
  histories.value = {
    data: [...histories.value.data, ...data.data],
    nextCursor: data.nextCursor,
  }
}, {
  distance: 10,
  canLoadMore: () => {
    return !!histories.value?.nextCursor
  },
})

async function deleteInvocationHistory(id: string) {
  const { error } = await safe(client.utility.invocationHistories.delete({ id }))
  if (error) {
    toast.error(error?.message || String(error))
    return
  }
  fetchInvocationHistories()
}
</script>

<template>
  <div>
    <Input
      v-model="search"
      placeholder="Search"
      autocorrect="off"
      class="mb-4"
    />
    <ListboxRoot highlight-on-hover>
      <ListboxContent ref="scrollElement" class="w-full h-full max-h-96 overflow-y-auto" :class="!histories ? '!min-h-96' : ''">
        <template v-if="histories">
          <template v-if="histories.data.length === 0">
            <p class="text-sm text-center text-muted-foreground">
              No invocation history found.
            </p>
          </template>
          <template v-else>
            <ListboxVirtualizer
              v-slot="{ option, virtualizer }"
              :options="histories?.data || []"
              :text-content="(opt) => opt.input"
              :overscan="0"
            >
              <div
                :ref="(el) => {
                  if (el) {
                    virtualizer.measureElement(el as HTMLDivElement)
                  }
                }"
                class="w-full"
              >
                <ListboxItem :value="option" class="w-full gap-4 py-2 rounded-lg p-3 border mb-2 data-[highlighted]:bg-secondary transition-colors focus:outline-none" @select.prevent="emit('restore', option)">
                  <div class="w-full flex flex-col pr-8 relative">
                    <p class="text-sm font-medium">
                      {{ option.createdAt.toLocaleString() }}
                    </p>
                    <p class="w-full text-sm text-muted-foreground truncate mt-1">
                      Input: {{ option.input }}
                    </p>
                    <div class="absolute top-0 -right-1">
                      <Button
                        size="icon"
                        class="w-6 h-6 bg-foreground/20 text-foreground hover:text-background"
                        @click.stop="deleteInvocationHistory(option.id)"
                      >
                        <X />
                      </Button>
                    </div>
                  </div>
                </ListboxItem>
              </div>
            </ListboxVirtualizer>
          </template>
        </template>
      </ListboxContent>
    </ListboxRoot>
  </div>
</template>
