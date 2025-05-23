import type { MaybeRefOrGetter } from 'vue'
import { createSharedComposable } from '@vueuse/core'
import { useFilter } from 'reka-ui'
import { onMounted, ref, toValue, watch } from 'vue'

export interface CodePlayground {
  id: string
  name: string
  inputs: string[]
  icon?: string
  referenceUrl: string
}

const $codePlaygrounds: CodePlayground[] = [
  {
    id: 'markdown',
    name: 'Markdown',
    inputs: ['markdown'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/markdown',
  },
  {
    id: 'html',
    name: 'HTML',
    inputs: ['html', 'css', 'javascript'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/html',
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    inputs: ['javascript'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/javascript',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    inputs: ['typescript'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/typescript',
  },
  {
    id: 'mjml',
    name: 'MJML',
    inputs: ['mjml'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/mjml',
  },
  {
    id: 'python',
    name: 'Python (Pyodide)',
    inputs: ['python'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/python-wasm',
  },
  // TODO: Golang need to wait for livecodes support of wasm based execution
  // See: https://github.com/live-codes/livecodes/issues/796
  // {
  //   id: 'go',
  //   name: 'Go',
  //   editors: ['script'],
  //   icon: undefined,
  //   referenceUrl: 'https://livecodes.io/docs/languages/go',
  // },
  {
    id: 'cpp',
    name: 'C++',
    inputs: ['cpp'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/cpp-wasm',
  },
  {
    id: 'csharp',
    name: 'C#',
    inputs: ['csharp'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/csharp-wasm',
  },
  {
    id: 'java',
    name: 'Java',
    inputs: ['java'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/java',
  },
  {
    id: 'php',
    name: 'PHP',
    inputs: ['php'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/php-wasm',
  },
  {
    id: 'perl',
    name: 'Perl',
    inputs: ['perl'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/perl',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    inputs: ['ruby'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/ruby-wasm',
  },
  {
    id: 'lua',
    name: 'Lua',
    inputs: ['lua'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/lua-wasm',
  },
  {
    id: 'julia',
    name: 'Julia',
    inputs: ['julia'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/julia',
  },
  {
    id: 'gleam',
    name: 'Gleam',
    inputs: ['gleam'],
    icon: undefined,
    referenceUrl: 'https://livecodes.io/docs/languages/gleam',
  },
]
export const codePlaygrounds = $codePlaygrounds

export function _useCodePlayground({ search }: { search?: MaybeRefOrGetter<string> } = {}) {
  const { contains } = useFilter({ sensitivity: 'base' })

  const playgroundState = ref<'idle' | 'loading' | 'loadingMore' | 'pending'>('idle')

  const allCodePlaygrounds = ref<CodePlayground[]>([])
  const codePlaygrounds = ref<CodePlayground[]>([])

  const loadCodePlaygrounds = async () => {
    if (playgroundState.value !== 'idle') {
      return
    }
    playgroundState.value = 'loading'
    allCodePlaygrounds.value = $codePlaygrounds
    const searchKeyword = toValue(search)
    codePlaygrounds.value = searchKeyword ? allCodePlaygrounds.value.filter(p => contains(p.name, searchKeyword)) : allCodePlaygrounds.value
    playgroundState.value = 'idle'
  }
  onMounted(loadCodePlaygrounds)
  watch(() => toValue(search), loadCodePlaygrounds)

  return {
    playgroundState,
    codePlaygrounds,
    loadCodePlaygrounds,
  }
}
export const useCodePlayground = createSharedComposable(_useCodePlayground)
