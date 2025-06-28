<script setup lang="ts">
import type { LanguageSupport } from '@codemirror/language'
import type { Diagnostic, LintSource } from '@codemirror/lint'
import type { Extension, SelectionRange, Text, Transaction } from '@codemirror/state'
import type { ViewUpdate } from '@codemirror/view'
import type { StyleSpec } from 'style-mod'
import type { Language } from './languages'
import { StreamLanguage } from '@codemirror/language'
import { Compartment, EditorSelection, EditorState, StateEffect } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useColorMode } from '@vueuse/core'
import { computed, nextTick, onUnmounted, ref, shallowRef, useSlots, useTemplateRef, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  /**
   * CodeMirror Language
   *
   * @see {@link https://codemirror.net/docs/ref/#language}
   */
  lang?: string | LanguageSupport | (() => LanguageSupport | Promise<LanguageSupport>)
  /**
   * Theme
   *
   * @see {@link https://codemirror.net/docs/ref/#view.EditorView^theme}
   */
  theme?: Record<string, StyleSpec>
  /** Dark Mode */
  dark?: boolean
  /**
   * Placeholder
   *
   * @see {@link https://codemirror.net/docs/ref/#view.placeholder}
   */
  placeholder?: string | HTMLElement
  /**
   * Line wrapping
   *
   * An extension that enables line wrapping in the editor (by setting CSS white-space to pre-wrap in the content).
   *
   * @see {@link https://codemirror.net/docs/ref/#view.EditorView%5ElineWrapping}
   */
  wrap?: boolean
  /**
   * Allow tab key indent.
   *
   * @see {@link https://codemirror.net/examples/tab/}
   */
  tab?: boolean
  /**
   * Tab character
   */
  indentUnit?: string
  /**
   * Allow Multiple Selection.
   *
   * @see {@link https://codemirror.net/docs/ref/#state.EditorState^allowMultipleSelections}
   */
  allowMultipleSelections?: boolean
  /**
   * Tab size
   *
   * @see {@link https://codemirror.net/docs/ref/#state.EditorState^tabSize}
   */
  tabSize?: number
  /**
   * Set line break (separetor) char.
   *
   * @see {@link https://codemirror.net/docs/ref/#state.EditorState^lineSeparator}
   */
  lineSeparator?: string
  /**
   * Readonly
   *
   * @see {@link https://codemirror.net/docs/ref/#state.EditorState^readOnly}
   */
  readonly?: boolean
  /**
   * Disable input.
   *
   * This is the reversed value of the CodeMirror editable.
   * Similar to `readonly`, but setting this value to true disables dragging.
   *
   * @see {@link https://codemirror.net/docs/ref/#view.EditorView^editable}
   */
  disabled?: boolean
  /**
   * Additional Extension
   *
   * @see {@link https://codemirror.net/docs/ref/#state.Extension}
   */
  extensions?: Extension[]
  /**
   * Language Phreses
   *
   * @see {@link https://codemirror.net/examples/translate/}
   */
  phrases?: Record<string, string>
  /**
   * CodeMirror Linter
   *
   * @see {@link https://codemirror.net/docs/ref/#lint.linter}
   */
  linter?: LintSource | any
  /**
   * Linter Config
   *
   * @see {@link https://codemirror.net/docs/ref/#lint.linter^config}
   */
  linterConfig?: Record<string, any>
  /**
   * Forces any linters configured to run when the editor is idle to run right away.
   *
   * @see {@link https://codemirror.net/docs/ref/#lint.forceLinting}
   */
  forceLinting?: boolean
  /**
   * Show Linter Gutter
   *
   * An area to 🔴 the lines with errors will be displayed.
   * This feature is not enabled if `linter` is not specified.
   *
   * @see {@link https://codemirror.net/docs/ref/#lint.lintGutter}
   */
  gutter?: boolean
  /**
   * Gutter Config
   *
   * @see {@link https://codemirror.net/docs/ref/#lint.lintGutter^config}
   */
  gutterConfig?: Record<string, any>
  /**
   * Using tag
   */
  tag?: string
}>(), {
  dark: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [string]
  /** CodeMirror ViewUpdate */
  'update': [ViewUpdate]
  /** CodeMirror onReady */
  'ready': [{ view: EditorView, state: EditorState, container: HTMLElement }]
  /** CodeMirror onFocus */
  'focus': [boolean]
  /** State Changed */
  'change': [EditorState]
  /** CodeMirror onDestroy */
  'destroy': []
}>()

const slots = useSlots()

/** Editor DOM */
const editor = useTemplateRef<HTMLElement>('editorRef')

/** Internal value */
const view = shallowRef<EditorView | null>(null)

/**
 * CodeMirror Editor View
 *
 * @see {@link https://codemirror.net/docs/ref/#view.EditorView}
 */
const doc = ref<string | Text>(props.modelValue ?? '')

const focusState = ref(false)

/**
 * Focus
 *
 * @see {@link https://codemirror.net/docs/ref/#view.EditorView.hasFocus}
 */
const focus = computed({
  get: () => focusState.value,
  set: (value) => {
    if (value) {
      view.value?.focus()
    }
  },
})

/**
 * Editor Selection
 *
 * @see {@link https://codemirror.net/docs/ref/#state.EditorSelection}
 */
const selection = computed({
  get: () => view.value?.state.selection,
  set: value => view.value?.dispatch({ selection: value }),
})

/** Cursor Position */
const cursor = computed({
  get: () => view.value?.state.selection.main.head,
  set: (value) => {
    if (value !== undefined) {
      view.value?.dispatch({ selection: { anchor: value } })
    }
  },
})

/** JSON */
const json = computed({
  get: () => view.value?.state.toJSON(),
  set: value => view.value?.setState(EditorState.fromJSON(value)),
})

/** Text length */
const length = ref(0)

/**
 * Returns the number of active lint diagnostics in the given state.
 *
 * @see {@link https://codemirror.net/docs/ref/#lint.diagnosticCount}
 */
const diagnosticCount = ref(0)

// https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
async function loadBasicSetupExtensions(options: { defaultKeymap: boolean }) {
  const [
    { keymap, highlightSpecialChars, drawSelection, highlightActiveLine, dropCursor, rectangularSelection, crosshairCursor, lineNumbers, highlightActiveLineGutter },
    { EditorState },
    { defaultHighlightStyle, syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap },
    { defaultKeymap, history, historyKeymap },
    { searchKeymap, highlightSelectionMatches },
    { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap },
    { lintKeymap },
  ] = await Promise.all([
    import('@codemirror/view'),
    import('@codemirror/state'),
    import('@codemirror/language'),
    import('@codemirror/commands'),
    import('@codemirror/search'),
    import('@codemirror/autocomplete'),
    import('@codemirror/lint'),
  ])

  const extensions = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter({
      markerDOM: (open) => {
        const icon = document.createElement('span')
        icon.className = 'size-4 opacity-75 hover:opacity-100'
        icon.innerHTML = open ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down-icon lucide-chevron-down size-full"><path d="m6 9 6 6 6-6"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right-icon lucide-chevron-right size-full"><path d="m9 18 6-6-6-6"/></svg>'
        return icon
      },
    }),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
  ]
  if (options.defaultKeymap) {
    extensions.push(keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      ...lintKeymap,
    ]))
  }

  return extensions
}

const { store, system } = useColorMode()
const isDarkMode = computed(() => (store.value === 'auto' ? system.value : store.value) === 'dark')

async function loadExtensions() {
  const language = new Compartment()
  const tabSize = new Compartment()

  const importLanguage = (lang: string) => {
    const cmLanguageImportMap = {
      html: () => import('@codemirror/lang-html').then(m => m.html()),
      css: () => import('@codemirror/lang-css').then(m => m.css()),
      javascript: () => import('@codemirror/lang-javascript').then(m => m.javascript()),
      jsx: () => import('@codemirror/lang-javascript').then(m => m.javascript({ jsx: true })),
      typescript: () => import('@codemirror/lang-javascript').then(m => m.javascript({ typescript: true })),
      yaml: () => import('@codemirror/lang-yaml').then(m => m.yaml()),
      json: () => import('@codemirror/lang-json').then(m => m.json()),
      markdown: () => import('@codemirror/lang-markdown').then(m => m.markdown()),
      python: () => import('@codemirror/lang-python').then(m => m.python()),
      go: () => import('@codemirror/lang-go').then(m => m.go()),
      rust: () => import('@codemirror/lang-rust').then(m => m.rust()),
      cpp: () => import('@codemirror/lang-cpp').then(m => m.cpp()),
      csharp: () => import('@codemirror/legacy-modes/mode/clike').then(m => StreamLanguage.define(m.csharp) as unknown as LanguageSupport),
      java: () => import('@codemirror/lang-java').then(m => m.java()),
      php: () => import('@codemirror/lang-php').then(m => m.php()),
      perl: () => import('codemirror-lang-perl').then(m => m.perl()),
      ruby: () => import('@codemirror/legacy-modes/mode/ruby').then(m => StreamLanguage.define(m.ruby) as unknown as LanguageSupport),
      lua: () => import('@codemirror/legacy-modes/mode/lua').then(m => StreamLanguage.define(m.lua) as unknown as LanguageSupport),
      julia: () => import('@codemirror/legacy-modes/mode/julia').then(m => StreamLanguage.define(m.julia) as unknown as LanguageSupport),
      // @ts-expect-error unresolved type
      gleam: () => import('@exercism/codemirror-lang-gleam').then(m => m.gleam()),
    } satisfies Record<Language, () => Promise<LanguageSupport>>
    return cmLanguageImportMap[lang as keyof typeof cmLanguageImportMap]?.()
  }

  const [
    basicSetup,
    { indentUnit },
    { forceLinting, linter, lintGutter },
    { keymap, placeholder },
    { indentWithTab },
    { vscodeKeymap },
  ] = await Promise.all([
    loadBasicSetupExtensions({ defaultKeymap: false }),
    import('@codemirror/language'),
    import('@codemirror/lint'),
    import('@codemirror/view'),
    import('@codemirror/commands'),
    import('@replit/codemirror-vscode-keymap'),
  ])

  const extensions = [
    ...basicSetup,

    keymap.of(vscodeKeymap),
    EditorView.updateListener.of((update: ViewUpdate): void => {
      if (view.value === null)
        return
      if (update.focusChanged) {
        emit('focus', view.value.hasFocus || false)
        focusState.value = view.value.hasFocus
      }
      if (update.changes.empty || !update.docChanged)
        return // Suppress event firing if no change

      length.value = view.value.state.doc?.length
      if (props.linter) {
        if (props.forceLinting)
          forceLinting(view.value)
        diagnosticCount.value = (props.linter(view.value) as readonly Diagnostic[]).length // Count diagnostics.
      }
      emit('update', update)
    }),
    props.theme
      ? EditorView.theme(props.theme, { dark: props.dark || isDarkMode.value })
      : await import('./theme').then(m => props.dark || isDarkMode.value ? m.dark : m.light),

    ...[
      // Toggle line wrapping
      props.wrap ? EditorView.lineWrapping : undefined,
      // Indent with tab
      props.tab ? keymap.of([indentWithTab]) : undefined,
      // Tab character
      props.indentUnit ? indentUnit.of(props.indentUnit) : undefined,
      // Allow Multiple Selections
      EditorState.allowMultipleSelections.of(props.allowMultipleSelections),
      // Indent tab size
      props.tabSize ? tabSize.of(EditorState.tabSize.of(props.tabSize)) : undefined,
      // locale settings
      props.phrases ? EditorState.phrases.of(props.phrases) : undefined,
      // Readonly option
      EditorState.readOnly.of(props.readonly),
      // Editable option
      EditorView.editable.of(!props.disabled),
      // Set Line break char
      props.lineSeparator ? EditorState.lineSeparator.of(props.lineSeparator) : undefined,
      // Lang
      props.lang
        ? language.of(
            typeof props.lang === 'string'
              ? await importLanguage(props.lang)
              : typeof props.lang === 'function' ? await props.lang() : props.lang,
          )
        : undefined,
      // Append Linter settings
      props.linter ? linter(props.linter, props.linterConfig) : undefined,
      // Show 🔴 to error line when linter enabled.
      props.linter && props.gutter ? lintGutter(props.gutterConfig) : undefined,
      // Placeholder
      props.placeholder ? placeholder(props.placeholder) : undefined,
    ].filter(extension => extension !== undefined),

    // Append Extensions
    ...(props.extensions ?? []),
  ]

  return extensions
}

watch([
  () => props.extensions,
  () => props.lang,
  // Theme specific
  isDarkMode,
  () => props.theme,
  () => props.dark,
], async () => {
  const exts = await loadExtensions()
  view.value?.dispatch({ effects: StateEffect.reconfigure.of(exts) })
}, { immediate: true })

// for parent-to-child binding.
watch(() => props.modelValue, async (value) => {
  if (value === undefined || !view.value)
    return
  if (view.value.composing /* IME fix */ || view.value.state.doc.toJSON().join(props.lineSeparator ?? '\n') === value /* don't need to update */) {
    // Do not commit CodeMirror's store.
    return
  }

  // Range Fix ?
  // https://github.com/logue/vue-codemirror6/issues/27
  const isSelectionOutOfRange = !view.value.state.selection.ranges.every(range => range.anchor < value.length && range.head < value.length)

  // Update
  view.value.dispatch({
    changes: { from: 0, to: view.value.state.doc.length, insert: value },
    selection: isSelectionOutOfRange ? { anchor: 0, head: 0 } : view.value.state.selection,
    scrollIntoView: true,
  })
}, { immediate: true })

/** When loaded */
watch(editor, async (container) => {
  if (!container) {
    return
  }

  /** Initial value */
  let value: string | Text = doc.value
  if (slots.default && container.childNodes[0]) {
    // when slot mode, overwrite initial value
    if (doc.value !== '') {
      console.warn('[CodeMirror.vue] The <code-mirror> tag contains child elements that overwrite the `v-model` values.')
    }
    value = (container.childNodes[0] as HTMLElement).textContent?.trim() || ''
  }

  const extensions = await loadExtensions()
  // Register CodeMirror
  view.value = new EditorView({
    parent: container,
    state: EditorState.create({ doc: value, extensions }),
    dispatch: (tr: Transaction) => {
      view.value?.update([tr])
      if (tr.changes.empty || !tr.docChanged) {
        // if not change value, no fire emit event
        return
      }

      // console.log(view.state.doc.toString(), tr);
      // state.toString() is not defined, so use toJSON and toText function to convert string.
      emit('update:modelValue', tr.state.doc.toString() ?? '')
      // Emit EditorState
      emit('change', tr.state)
    },
  })

  await nextTick()
  emit('ready', {
    view: view.value,
    state: view.value.state,
    container,
  })
})

/** Destroy */
onUnmounted(() => {
  view.value?.destroy()
  emit('destroy')
})

/**
 * Forces any linters configured to run when the editor is idle to run right away.
 *
 * @see {@link https://codemirror.net/docs/ref/#lint.forceLinting}
 */
async function lint() {
  if (!props.linter || !view.value) {
    return
  }
  const { diagnosticCount: linterDiagnosticCount, forceLinting } = await import('@codemirror/lint')
  if (props.forceLinting) {
    forceLinting(view.value)
  }
  diagnosticCount.value = linterDiagnosticCount(view.value.state)
}

/**
 * Force Reconfigure Extension
 *
 * @see {@link https://codemirror.net/examples/config/#top-level-reconfiguration}
 */
async function forceReconfigure() {
  const extensions = await loadExtensions()
  // Deconfigure all Extensions
  view.value?.dispatch({ effects: StateEffect.reconfigure.of([]) })
  // Register extensions
  view.value?.dispatch({ effects: StateEffect.appendConfig.of(extensions) })
}

/* ----- Bellow is experimental. ------ */

/**
 * Get the text between the given points in the editor.
 *
 * @param from - start line number
 * @param to - end line number
 */
const getRange = (from?: number, to?: number): string | undefined => view.value?.state.sliceDoc(from, to)
/**
 * Get the content of line.
 *
 * @param number - line number
 */
const getLine = (number: number): string => view.value?.state.doc.line(number + 1).text ?? ''
/** Get the number of lines in the editor. */
const lineCount = (): number => view.value?.state.doc.lines ?? 0
/** Retrieve one end of the primary selection. */
const getCursor = (): number => view.value?.state.selection.main.head ?? 0
/** Retrieves a list of all current selections. */
function listSelections(): readonly SelectionRange[] {
  let _view$value$state$sel
  // eslint-disable-next-line no-cond-assign
  return (_view$value$state$sel = view.value?.state.selection.ranges) !== null && _view$value$state$sel !== undefined ? _view$value$state$sel : []
}
/** Get the currently selected code. */
function getSelection(): string {
  let _view$value$state$sli
  // eslint-disable-next-line no-cond-assign
  return (_view$value$state$sli = view.value?.state.sliceDoc(view.value.state.selection.main.from, view.value.state.selection.main.to)) !== null && _view$value$state$sli !== undefined
    ? _view$value$state$sli
    : ''
}
/**
 * The length of the given array should be the same as the number of active selections.
 * Replaces the content of the selections with the strings in the array.
 */
function getSelections(): string[] {
  const s = view.value?.state
  if (!s)
    return []

  return s.selection.ranges.map((r: { from: number, to: number }) => s.sliceDoc(r.from, r.to))
}
/** Return true if any text is selected. */
const somethingSelected = (): boolean => view.value?.state.selection.ranges.some((r: { empty: boolean }) => !r.empty) ?? false

/**
 * Replace the part of the document between from and to with the given string.
 *
 * @param replacement - replacement text
 * @param from - start string at position
 * @param to -  insert the string at position
 */
function replaceRange(
  replacement: string | Text,
  from: number,
  to: number,
): void {
  return view.value?.dispatch({ changes: { from, to, insert: replacement } })
}
/**
 * Replace the selection(s) with the given string.
 * By default, the new selection ends up after the inserted text.
 *
 * @param replacement - replacement text
 */
const replaceSelection = (replacement: string | Text): void => view.value?.dispatch(view.value?.state.replaceSelection(replacement))
/**
 * Set the cursor position.
 *
 * @param position - position.
 */
const setCursor = (position: number): void => view.value?.dispatch({ selection: { anchor: position } })
/**
 * Set a single selection range.
 *
 * @param anchor - anchor position
 * @param head -
 */
const setSelection = (anchor: number, head?: number): void => view.value?.dispatch({ selection: { anchor, head } })
/**
 * Sets a new set of selections. There must be at least one selection in the given array.
 *
 * @param ranges - Selection range
 * @param primary -
 */
function setSelections(ranges: readonly SelectionRange[], primary?: number): void {
  return view.value?.dispatch({ selection: EditorSelection.create(ranges, primary) })
}
/**
 * Applies the given function to all existing selections, and calls extendSelections on the result.
 *
 * @param f - function
 */
const extendSelectionsBy = (f: any): void => view.value?.dispatch({ selection: EditorSelection.create(selection.value?.ranges.map((r: SelectionRange) => r.extend(f(r))) ?? []) })

/** Export properties and functions */
defineExpose({
  editor,
  view,
  cursor,
  selection,
  focus,
  length,
  json,
  diagnosticCount,
  dom: view.value?.contentDOM,
  lint,
  forceReconfigure,
  // Bellow is CodeMirror5's function
  getRange,
  getLine,
  lineCount,
  getCursor,
  listSelections,
  getSelection,
  getSelections,
  somethingSelected,
  replaceRange,
  replaceSelection,
  setCursor,
  setSelection,
  setSelections,
  extendSelectionsBy,
})

const minHeight = computed(() => editor.value?.style.minHeight ? `${editor.value.style.minHeight}` : '0')
</script>

<template>
  <component
    :is="props.tag ?? 'div'"
    ref="editorRef"
    class="cm-wrapper flex flex-row w-full h-full [&>.cm-editor]:grow [&>.cm-editor]:w-[0] [&>.cm-editor]:h-full [&>.cm-editor]:cursor-text [&>.cm-editor]:select-auto [&>.cm-editor_.cm-line_span]:cursor-text border border-input rounded-md overflow-x-auto transition-[color,box-shadow]"
    :class="[
      focus ? 'border-ring ring-ring/50 ring-[3px]' : '',
      props.readonly ? '[&_.cm-cursor]:!hidden' : '',
    ]"
    @click="focus = true"
  >
    <aside v-if="slots.default" style="display: none;" aria-hidden="true">
      <slot />
    </aside>
  </component>
</template>

<style scoped>
.cm-wrapper :deep(.cm-content) {
  min-height: v-bind(minHeight) !important;
}
</style>
