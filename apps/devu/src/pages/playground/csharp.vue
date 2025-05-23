<script setup lang="ts">
import type { HeadlessLiveCodesConfig } from '@/composables/use-headless-livecodes'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CodeMirror } from '@/components/code-mirror'
import { PlaygroundLayout, PlaygroundOutput } from '@/components/playground'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { useHeadlessLiveCodes } from '@/composables/use-headless-livecodes'

const route = useRoute()

const csharp = ref(route.query.csharp
  ? String(route.query.csharp)
  : `using System;

public class Program
{
    public static void Main()
    {
        int[] sortedArray = { 1, 3, 5, 7, 9, 11, 13, 15 };
        int itemToSearch = 7;

        int result = BinarySearch(sortedArray, 0, sortedArray.Length - 1, itemToSearch);

        if (result == -1)
        {
            Console.WriteLine("Result: Item not found in the array.");
        }
        else
        {
            Console.WriteLine($"Result: Item found at index -> {result}");
        }
    }

    public static int BinarySearch(int[] arr, int left, int right, int item)
    {
        if (right >= left)
        {
            int mid = left + (right - left) / 2;
            if (arr[mid] == item)
            {
                return mid;
            }

            if (arr[mid] > item)
            {
                return BinarySearch(arr, left, mid - 1, item);
            }

            return BinarySearch(arr, mid + 1, right, item);
        }
        return -1;
    }
}
`)

const config = computed<HeadlessLiveCodesConfig>(() => ({
  script: {
    language: 'csharp-wasm',
    content: csharp.value,
  },
}))
const { code, consoleEntries } = useHeadlessLiveCodes(config)
</script>

<template>
  <PlaygroundLayout v-slot="{ wrapperWidth }">
    <ResizablePanelGroup :direction="wrapperWidth > 640 ? 'horizontal' : 'vertical'">
      <ResizablePanel>
        <CodeMirror
          v-model="csharp"
          lang="csharp"
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
