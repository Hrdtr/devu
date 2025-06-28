<script setup lang="ts">
/* eslint-disable unicorn/escape-case */
import type { ITerminalInitOnlyOptions, ITerminalOptions } from '@xterm/xterm'
import { useCssVar, useElementBounding } from '@vueuse/core'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { defu } from 'defu'
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import '@xterm/xterm/css/xterm.css'

const props = withDefaults(defineProps<{
  config?: ITerminalOptions & ITerminalInitOnlyOptions
}>(), {
  /*  */
})
const emit = defineEmits<{
  ready: [api: Terminal]
}>()

const rootFontSizeCssVar = useCssVar('--root-font-size')
const configWithDefaults = computed(() => defu(props.config, {
  // Same setup with apps/devu/src/components/code-mirror/theme.ts .cm-content
  // Since it can't using pixel unit, the line height is calculated using the same ratio as the CodeMirror content
  fontSize: (rootFontSizeCssVar.value ? Number(rootFontSizeCssVar.value.replace('px', '')) : 16) - 2,
  lineHeight: ((6 / (rootFontSizeCssVar.value ? Number(rootFontSizeCssVar.value.replace('px', '')) : 16)) * 1) + 1,
} as ITerminalOptions & ITerminalInitOnlyOptions))

const terminalContainerRef = useTemplateRef('terminalContainer')
const terminal = ref<Terminal>()
const fitAddon = ref<FitAddon>()

watch(terminalContainerRef, (value) => {
  if (value) {
    terminal.value = new Terminal(configWithDefaults.value)
    fitAddon.value = new FitAddon()
    terminal.value.loadAddon(fitAddon.value)
    terminal.value.open(value)
    fitAddon.value.fit()
    emit('ready', terminal.value)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  // terminal.value?.dispose()
  // fitAddon.value?.dispose()
  terminal.value = undefined
  fitAddon.value = undefined
})

watch(configWithDefaults, (value) => {
  if (terminal.value) {
    terminal.value.options = value
  }
}, { immediate: true, deep: true })

const { width, height } = useElementBounding(terminalContainerRef)
watch([width, height], () => {
  fitAddon.value?.fit()
})

const ansiColorAliasMap = {
  trace: '\x1b[37m', // Bright white
  debug: '\x1b[36;1m', // Bright cyan
  info: '\x1b[32;1m', // Bright green
  warn: '\x1b[33;1m', // Bright yellow
  error: '\x1b[31;1m', // Bright red
  fatal: '\x1b[97m\x1b[41m', // White text on bright red background
  reset: '\x1b[0m',
}
type ANSIColorAlias = keyof typeof ansiColorAliasMap

const write = (value: string) => terminal.value?.write(value)
write.withANSIColor = (value: string, ansiColor?: Exclude<ANSIColorAlias, 'reset'> | string & {}) => {
  terminal.value?.write(`${ansiColor ? (ansiColor in ansiColorAliasMap ? ansiColorAliasMap[ansiColor as ANSIColorAlias] : ansiColor) : ''}${value}${ansiColor ? ansiColorAliasMap.reset : ''}`)
}

const writeln = (value: string) => terminal.value?.writeln(value)
writeln.withANSIColor = (value: string, ansiColor?: Exclude<ANSIColorAlias, 'reset'> | string & {}) => {
  terminal.value?.writeln(`${ansiColor ? (ansiColor in ansiColorAliasMap ? ansiColorAliasMap[ansiColor as ANSIColorAlias] : ansiColor) : ''}${value}${ansiColor ? ansiColorAliasMap.reset : ''}`)
}

const clear = () => terminal.value?.clear()

defineExpose({ api: terminal, write, writeln, clear })
</script>

<template>
  <div ref="terminalContainer" class="terminal-container dark w-full h-full bg-black [&_>_.xterm]:px-4 [&_>_.xterm]:py-2" />
</template>
