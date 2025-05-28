import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

const lightBase = {
  background: 'color-mix(in oklab, var(--input) 30%, transparent)', // Background (base: '#ffffff')
  text: 'var(--foreground)', // Foreground (base: '#0f172a')
  selection: '#cbd5e1', // Selection
  comment: '#64748b', // Comment, Bracket
  caret: '#1e293b', // Caret
  tag: '#065f46', // TagName, Name, Quote
  class: '#7c3aed', // ClassName, PropertyName, Heading, Emphasis
  variable: '#2563eb', // Variable, AttrName, Number, Operator
  keyword: '#dc2626', // Keyword, Type
  string: '#15803d', // String, Meta, Regexp
  atom: '#b45309', // Atom, Bool, Special
  invalid: '#b91c1c', // Invalid
  gutterBackground: 'var(--background)', // Gutter background (base: '#f1f5f9')
  gutterText: 'var(--foreground)', // Gutter foreground (base: '#1e293b')
  deletedBackground: '#fee2e2', // Deleted background
  deletedText: '#7f1d1d', // Deleted text
  tooltipBackground: 'var(--card)', // Tooltip background (base: '#f1f5f9')
  tooltipText: 'var(--card-foreground)', // Tooltip foreground (base: '#1e293b')
}

const darkBase = {
  background: 'color-mix(in oklab, var(--input) 30%, transparent)', // Background (base: '#0d1117')
  text: 'var(--foreground)', // Foreground (base: '#c9d1d9')
  selection: '#003d73', // Selection
  comment: '#8b949e', // Comment, Bracket
  caret: '#c9d1d9', // Caret
  tag: '#7ee787', // TagName, Name, Quote
  class: '#d2a8ff', // ClassName, PropertyName, Heading, Emphasis
  variable: '#79c0ff', // Variable, AttrName, Number, Operator
  keyword: '#ff7b72', // Keyword, Type
  string: '#a5d6ff', // String, Meta, Regexp
  atom: '#ffab70', // Atom, Bool, Special
  invalid: '#f97583', // Invalid
  gutterBackground: 'var(--background)', // Gutter background (base: '#161b22')
  gutterText: 'var(--foreground)', // Gutter foreground (base: '#c9d1d9')
  deletedBackground: '#ffdcd7', // Deleted background
  deletedText: '#ffeef0', // Deleted text
  tooltipBackground: 'var(--card)', // Tooltip background (base: '#161b22')
  tooltipText: 'var(--card-foreground)', // Tooltip foreground (base: '#c9d1d9')
}

function createTheme(options?: { dark: boolean }) {
  const base = options?.dark ? darkBase : lightBase

  return EditorView.theme(
    {
      '&': {
        color: base.text,
        backgroundColor: base.background,
      },
      '.cm-content': {
        caretColor: base.caret,
        fontSize: 'calc(var(--root-font-size, 16px) - 2px)',
        lineHeight: 'calc(var(--root-font-size, 16px) + 6px)',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: base.caret,
      },
      '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
        {
          backgroundColor: base.selection,
        },
      '.cm-searchMatch': {
        backgroundColor: base.background, // Use the selection color for search matches
        color: base.text, // Ensure the text color contrasts with the background
        outline: `1px solid ${base.caret}`, // Highlight with a subtle outline
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: base.text, // Use a distinct color for the selected search match
        color: base.background, // Invert color for high visibility
        outline: `1px solid ${base.caret}`,
      },
      '.cm-panels': {
        backgroundColor: base.background, // Use the main background color for consistency
        color: base.text,
      },
      '.cm-panels.cm-panels-top': {
        borderBottom: '2px solid black',
      },
      '.cm-panels.cm-panels-bottom': {
        borderTop: '2px solid black',
      },
      '.cm-activeLine': {
        backgroundColor: `color-mix(in oklab, ${base.text} 2.5%, transparent)`,
      },
      '.cm-gutters': {
        backgroundColor: base.gutterBackground,
        color: base.gutterText,
        fontSize: 'calc(var(--root-font-size, 16px) - 2px)',
        borderRight: `1px solid color-mix(in oklab, ${base.text} 2.5%, transparent)`,
      },
      '.cm-gutterElement': {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'end',
        alignItems: 'center',
      },
      '.cm-activeLineGutter': {
        backgroundColor: `color-mix(in oklab, ${base.text} 2.5%, transparent)`,
      },
      '.cm-tooltip': {
        backgroundColor: base.tooltipBackground,
        color: base.tooltipText,
      },
      '.cm-foldPlaceholder': {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      },
    },
    { dark: options?.dark || false },
  )
}

function createThemeSyntaxHighlighting(options?: { dark: boolean }) {
  const base = options?.dark ? darkBase : lightBase

  return syntaxHighlighting(HighlightStyle.define([
    { tag: [t.standard(t.tagName), t.tagName], color: base.tag },
    { tag: [t.comment, t.bracket], color: base.comment },
    { tag: [t.className, t.propertyName], color: base.class },
    {
      tag: [t.variableName, t.attributeName, t.number, t.operator],
      color: base.variable,
    },
    { tag: [t.keyword, t.typeName, t.typeOperator], color: base.keyword },
    { tag: [t.string, t.meta, t.regexp], color: base.string },
    { tag: [t.name, t.quote], color: base.tag },
    { tag: [t.heading, t.strong], color: base.class, fontWeight: 'bold' },
    { tag: [t.emphasis], color: base.class, fontStyle: 'italic' },
    { tag: [t.deleted], color: base.deletedText, backgroundColor: base.deletedBackground },
    { tag: [t.atom, t.bool, t.special(t.variableName)], color: base.atom },
    { tag: t.link, textDecoration: 'underline' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { tag: t.invalid, color: base.invalid },
  ]))
}

export const light = [
  createTheme({ dark: false }),
  createThemeSyntaxHighlighting({ dark: false }),
] as Extension

export const dark = [
  createTheme({ dark: true }),
  createThemeSyntaxHighlighting({ dark: true }),
] as Extension
