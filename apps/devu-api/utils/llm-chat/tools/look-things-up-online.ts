/// <reference lib="dom" />
import { createTool } from '@mastra/core'
import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'
import TurndownService from 'turndown'
import { z } from 'zod/v3'

// Building type declaration throws error if not imported
// eslint-disable-next-line perfectionist/sort-imports, unused-imports/no-unused-imports
import * as _ from '@mastra/core/tools'

export const lookThingsUpOnline = createTool({
  id: 'devu.look_things_up_online',
  description: 'Search the web and retrieve webpage content.',
  inputSchema: z.object({
    action: z.enum(['search', 'fetch_url_content']).describe(`
Use "search" to perform a DuckDuckGo search with the given queries (?q=<query>).
Use "fetch_url_content" to retrieve the content of the webpage(s) at the given URL(s).

Action "search" Usage Instructions:
- This action can be used when the user asks for information about something.
- After performing the search, you MUST select the most relevant URLs from the search results—those that best match the user's intent and provide the most accurate information.
- Immediately use this tool again with the "fetch_url_content" action, providing that URL in the input array. Do this WITHOUT asking the user for confirmation.
- If no relevant URL is found, you MUST either:
  1) attempt another search with a refined query, or
  2) return the message "No relevant result found."
- Prioritize the quality of information in the full webpage over the search snippet, as the snippet may be outdated or incomplete.
- Never skip the fetch_url_content step after using search. Always perform these steps sequentially: (1) search, then (2) fetch_url_content.

Action "fetch_url_content" Usage Instructions:
- This action can be used when the user has explicitly provided URLs and asked about their contents **OR** to fetch the content of a webpage that was selected from a prior search step.
- Use this to retrieve the most accurate and up-to-date information from the target webpage(s).

NOTES:
- Any results from this tool are NOT visible to the user. Therefore, DO NOT ask the user for confirmation.
`),
    input: z.string().array().max(3).describe('If the action is "search", provide one or more search queries. If the action is "fetch_url_content", provide one or more valid URLs (either selected by the agent after search or directly given by the user).'),
    options: z.object({
      clean: z.boolean().default(true).describe('Whether to clean the HTML content of the webpage using @mozilla/readability before converting it to Markdown (default: true). Only applicable when action is "fetch_url_content".'),
    }).optional(),
  }),
  execute: async ({ context }) => {
    console.info(`Look things up online with arguments: ${JSON.stringify(context, null, 2)}`)

    // Validate input
    if (!context.input || context.input.length === 0) {
      return 'Error: input must not be empty'
    }

    const urlsInvalid = []
    if (context.action === 'fetch_url_content') {
      const urlsValid = []
      for (const url of context.input) {
        try {
          const _ = new URL(url)
          urlsValid.push(url)
        }
        catch {
          urlsInvalid.push(url)
        }
      }
      if (urlsInvalid.length > 0) {
        return `Error: invalid URLs: ${urlsInvalid.join(', ')}`
      }
      if (urlsValid.length === 0) {
        return 'Error: no valid URLs provided'
      }
      context.input = urlsValid
    }

    try {
      if (context.action === 'search') {
        const data: Awaited<ReturnType<typeof search>>[] = []
        for (const query of context.input) {
          const result = await search(query)
          if (typeof result === 'string') {
            data.push(`**Search results for "${decodeURIComponent(query)}"**:\n\n${result}`)
          }
          else {
            data.push(`**Search results for "${decodeURIComponent(query)}"**:
${result.zeroClickInfo ? `\n${result.zeroClickInfo.source}\n${result.zeroClickInfo.contentSnippet}\n` : ''}
${result.results.map(result => `- ${result.title}
  URL: ${result.url}
  Content Snippet: ${result.contentSnippet}
  Link Text: ${result.linkText}`).join('\n\n')}`)
          }
        }

        return data.join('\n\n---\n\n')
      }
      else {
        const data: Awaited<ReturnType<typeof webpageToMarkdown>>[] = []
        for (const url of context.input) {
          const result = await webpageToMarkdown(url, context.options)
          data.push(`**Content of "${url}"**:\n\n${result}`)
        }

        return data.join('\n\n---\n\n')
      }
    }
    catch (error) {
      console.error('Error while looking things up online:', error)
      return `Error while looking things up online: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  },
})

async function search(query: string) {
  const response = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`)
  if (!response.ok) {
    return 'Error: failed to fetch search result'
  }
  const htmlString = await response.text().catch(() => 'Error: failed to fetch search result')
  if (htmlString.startsWith('Error:')) {
    return htmlString
  }

  const { document } = parseHTML(htmlString)
  const turndownService = new TurndownService()

  let zeroClickInfoTable: HTMLTableElement | null = null
  for (const td of Array.from(document.querySelectorAll('td'))) {
    if (td.textContent && td.textContent.toLowerCase().includes('zero-click info:')) {
      zeroClickInfoTable = td.closest('table')
      break
    }
  }

  let zeroClickInfo: { source: string, contentSnippet: string } | undefined
  if (zeroClickInfoTable) {
    zeroClickInfo = {
      source: turndownService.turndown(zeroClickInfoTable.querySelectorAll('td').item(0)?.querySelector('a')?.outerHTML || ''),
      contentSnippet: turndownService.turndown(zeroClickInfoTable.querySelectorAll('td').item(1)?.outerHTML || ''),
    }
  }

  const resultsTable: HTMLTableElement = document.querySelector('table td.result-snippet')?.closest('table') || document.createElement('table')
  const resultsTableRows = Array.from(resultsTable.querySelectorAll('tr')).filter(i => (i.textContent?.trim() || '').length > 0)

  const results: {
    title: string
    url: string
    contentSnippet: string
    linkText: string
  }[] = []

  for (let i = 0; i < resultsTableRows.length; i++) {
    const row = resultsTableRows[i]
    const linkElement = row?.querySelector<HTMLAnchorElement>('a.result-link')
    if (linkElement) {
      const title = linkElement.textContent?.trim() || ''
      const url = decodeURIComponent(new URL(`https:${linkElement.href}`).searchParams.get('uddg') || '')

      const contentSnippetRow = resultsTableRows[i + 1]
      const contentSnippet = contentSnippetRow?.querySelector('.result-snippet')?.textContent?.trim() || ''

      const urlRow = resultsTableRows[i + 2]
      const linkText = urlRow?.querySelector('.link-text')?.textContent?.trim() || ''

      if (title && url && contentSnippet) {
        results.push({ title, url, contentSnippet, linkText })
      }

      i += 2
    }
  }

  return {
    query: decodeURIComponent(query),
    zeroClickInfo,
    results,
  }
}

async function webpageToMarkdown(url: string, options?: { clean?: boolean }) {
  const response = await fetch(url)
  if (!response.ok) {
    return 'Error: failed to fetch webpage'
  }
  const htmlString = await response.text().catch(() => 'Error: failed to fetch webpage')
  if (htmlString.startsWith('Error:')) {
    return htmlString
  }

  let article = 'No content.'

  if (options?.clean !== false) {
    if (!htmlString.startsWith('<!DOCTYPE html>')) {
      return 'Error: invalid HTML'
    }
    const { document } = parseHTML(htmlString)
    const reader = new Readability(document, {
      charThreshold: 0,
      keepClasses: true,
      nbTopCandidates: 500,
    })

    article = reader.parse()?.content || 'No content.'
  }
  else {
    const { document } = parseHTML(htmlString)
    document.querySelectorAll('script').forEach(script => script.remove())
    document.querySelectorAll('noscript').forEach(noscript => noscript.remove())
    document.querySelectorAll('style').forEach(style => style.remove())
    document.querySelectorAll('iframe').forEach(iframe => iframe.remove())
    article = document.documentElement.outerHTML
  }

  const turndownService = new TurndownService()
  const md = turndownService.turndown(article)

  return md
}
