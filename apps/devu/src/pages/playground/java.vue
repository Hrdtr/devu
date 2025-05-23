<script setup lang="ts">
import type { HeadlessLiveCodesConfig } from '@/composables/use-headless-livecodes'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CodeMirror } from '@/components/code-mirror'
import { PlaygroundLayout, PlaygroundOutput } from '@/components/playground'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useHeadlessLiveCodes } from '@/composables/use-headless-livecodes'

const route = useRoute()

const java = ref(route.query.java
  ? String(route.query.java)
  : `public class BinarySearchSnippet {
  /**
   * Search an item with binarySearch algorithm.
   *
   * @param arr sorted array to search
   * @param item an item to search
   * @return if item is found, return the index position of the array item otherwise return -1
   */

  public static int binarySearch(int[] arr, int left, int right, int item) {
    if (right >= left) {
      int mid = left + (right - left) / 2;
      if (arr[mid] == item) {
        return mid;
      }

      if (arr[mid] > item) {
        return binarySearch(arr, left, mid - 1, item);
      }

      return binarySearch(arr, mid + 1, right, item);
    }
    return -1;
  }

  public static void main(String[] args) {
    int[] sortedArray = {1, 3, 5, 7, 9, 11, 13, 15};
    int itemToSearch = 7;

    int result = binarySearch(sortedArray, 0, sortedArray.length - 1, itemToSearch);

    if (result == -1) {
      System.out.println("Result: Item not found in the array.");
    } else {
      System.out.println("Result: Item found at index -> " + result);
    }
  }
}
`)

const config = computed<HeadlessLiveCodesConfig>(() => ({
  script: {
    language: 'java',
    content: java.value,
  },
}))
const { code, consoleEntries } = useHeadlessLiveCodes(config)
</script>

<template>
  <PlaygroundLayout v-slot="{ wrapperWidth }">
    <ResizablePanelGroup :direction="wrapperWidth > 640 ? 'horizontal' : 'vertical'">
      <ResizablePanel>
        <CodeMirror
          v-model="java"
          lang="java"
          class="rounded-none !border-0 !ring-0"
        />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel>
        <PlaygroundOutput
          v-bind="{
            code,
            consoleEntries,
            default: 'console',
            console: true,
          }"
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  </PlaygroundLayout>
</template>
