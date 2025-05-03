import type { Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

// GitHub Dark theme color definitions
const base00 = 'var(--background)' // Background
const base01 = 'var(--foreground)' // Foreground
const base02 = '#003d73' // Selection and Selection Match
const base03 = '#8b949e' // Comment and Bracket color
const base04 = '#c9d1d9' // Caret color (reusing foreground for consistency)
const base05 = '#7ee787' // TagName, Name, Quote
const base06 = '#d2a8ff' // ClassName, PropertyName, Heading, Strong, Emphasis
const base07 = '#79c0ff' // VariableName, AttributeName, Number, Operator
const base08 = '#ff7b72' // Keyword, TypeName, TypeOperator
const base09 = '#a5d6ff' // String, Meta, Regexp
const base0A = '#ffdcd7' // Deleted text color
const base0B = '#ffeef0' // Deleted background color
const base0C = '#ffab70' // Atom, Bool, Special VariableName
const invalid = '#f97583' // Invalid color

const highlightBackground
    = 'color-mix(in oklab, var(--foreground) 5%, transparent)' // Line highlight with some opacity
const tooltipBackground = '--var(--card)'
const tooltipColor = '--var(--card-foreground)'
const cursor = base04 // Caret color
const selection = base02 // Selection color

// Define the editor theme styles for GitHub Dark.
export const theme = EditorView.theme(
  {
    '&': {
      color: base01,
      backgroundColor: base00,
    },
    '.cm-content': {
      caretColor: cursor,
      fontSize: 'calc(var(--root-font-size, 16px) - 2px)',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: cursor,
    },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
      {
        backgroundColor: selection,
      },
    '.cm-searchMatch': {
      backgroundColor: base02, // Use the selection color for search matches
      color: base01, // Ensure the text color contrasts with the background
      outline: `1px solid ${base04}`, // Highlight with a subtle outline
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: base08, // Use a distinct color for the selected search match
      color: base00, // Invert color for high visibility
      outline: `1px solid ${base04}`,
    },
    '.cm-panels': {
      backgroundColor: base00, // Use the main background color for consistency
      color: base01,
    },
    '.cm-panels.cm-panels-top': {
      borderBottom: '2px solid black',
    },
    '.cm-panels.cm-panels-bottom': {
      borderTop: '2px solid black',
    },
    '.cm-activeLine': {
      backgroundColor: highlightBackground,
    },
    '.cm-gutters': {
      backgroundColor: base00, // Gutter background using the main background
      color: base03, // Use comment color for gutter foreground
      fontSize: 'calc(var(--root-font-size, 16px) - 2px)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: highlightBackground,
    },
    '.cm-tooltip': {
      backgroundColor: tooltipBackground,
      color: tooltipColor,
    },
  },
  { dark: true },
)

// Define the highlighting style for code in the GitHub Dark theme.
export const themeSyntaxHighlighting = HighlightStyle.define([
  { tag: [t.standard(t.tagName), t.tagName], color: base05 },
  { tag: [t.comment, t.bracket], color: base03 },
  { tag: [t.className, t.propertyName], color: base06 },
  {
    tag: [t.variableName, t.attributeName, t.number, t.operator],
    color: base07,
  },
  { tag: [t.keyword, t.typeName, t.typeOperator], color: base08 },
  { tag: [t.string, t.meta, t.regexp], color: base09 },
  { tag: [t.name, t.quote], color: base05 },
  { tag: [t.heading, t.strong], color: base06, fontWeight: 'bold' },
  { tag: [t.emphasis], color: base06, fontStyle: 'italic' },
  { tag: [t.deleted], color: base0A, backgroundColor: base0B },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: base0C },
  { tag: t.link, textDecoration: 'underline' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.invalid, color: invalid },
])

// Extension to enable the GitHub Dark theme (both the editor theme and the highlight style).
export default [
  theme,
  syntaxHighlighting(themeSyntaxHighlighting),
] as Extension
