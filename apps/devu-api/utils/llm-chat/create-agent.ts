import type { InferSelectModel } from 'drizzle-orm'
import type { schema } from '@/database'
import type { LLMProviderId } from '@/utils/use-llm-provider'
import { Agent } from '@mastra/core'
import { LibSQLStore, LibSQLVector } from '@mastra/libsql'
import { Memory } from '@mastra/memory'
import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai'
import { config } from '@/config'
import { useLLMEmbeddingModel } from '@/utils/use-llm-embedding-model'
import { useLLMLanguageModel } from '@/utils/use-llm-language-model'
import { useLLMProvider } from '@/utils/use-llm-provider'
import { invokeUtility, lookThingsUpOnline } from './tools'

// Building type declaration throws error if not imported
// eslint-disable-next-line perfectionist/sort-imports, unused-imports/no-unused-imports
import * as _ from '@mastra/core/tools'

export function createAgent<
  InvokeUtility extends boolean = false,
  LookThingsUpOnline extends boolean = false,
>(
  profile: InferSelectModel<typeof schema.llmChatProfile>,
  options: {
    embeddingProfile?: InferSelectModel<typeof schema.llmChatEmbeddingProfile>
    tools?: {
      invokeUtility?: InvokeUtility
      lookThingsUpOnline?: LookThingsUpOnline
    }
  } = {},
) {
  const tools = {
    ...(options.tools?.invokeUtility ? { invokeUtility } : {}),
    ...(options.tools?.lookThingsUpOnline ? { lookThingsUpOnline } : {}),
  } as {
    invokeUtility: InvokeUtility extends true ? typeof invokeUtility : never
    lookThingsUpOnline: LookThingsUpOnline extends true ? typeof lookThingsUpOnline : never
  }

  const provider = useLLMProvider(profile.provider as LLMProviderId, {
    credentials: profile.credentials,
    configuration: profile.configuration,
  })
  let model = useLLMLanguageModel(profile.model, provider)
  // Ollama provider doesn't support streaming when using tools
  // See: https://github.com/sgomez/ollama-ai-provider/issues/40
  if (profile.provider === 'ollama' && Object.keys(tools).length > 0) {
    model = wrapLanguageModel({
      model,
      middleware: simulateStreamingMiddleware(),
    })
  }

  const embeddingModelProvider = options.embeddingProfile
    ? useLLMProvider(options.embeddingProfile.provider as LLMProviderId, {
        credentials: options.embeddingProfile.credentials,
        configuration: options.embeddingProfile.configuration,
      })
    : undefined
  const embeddingModel = options.embeddingProfile && embeddingModelProvider
    ? useLLMEmbeddingModel(options.embeddingProfile.model, embeddingModelProvider)
    : undefined

  return new Agent({
    name: 'Devu\'s User Assistant',
    model,
    tools,
    memory: new Memory({
      storage: new LibSQLStore({ url: `file:${config.dbFilePath.llmAgentsMemory}` }),
      vector: new LibSQLVector({ connectionUrl: `file:${config.dbFilePath.llmAgentsMemory}` }),
      embedder: embeddingModel,
    }),
    instructions: `
You are a user development assistant, ready to help with coding tasks, documentation, and more.
You are integrated into a desktop application called Devu.

# Devu

<img align="right" src="apps/devu/public/icon-rounded.png" width="86" height="86" />

**Your AI-Powered Development Utility**

Devu is a versatile development utility that provides a suite of tools to enhance your coding workflow. It's built with Tauri, offering cross-platform support for Windows, macOS, and Linux.

[![GitHub license](https://img.shields.io/github/license/Hrdtr/devu.svg)](https://github.com/Hrdtr/devu/blob/main/LICENSE)
[![GitHub release](https://img.shields.io/github/release/Hrdtr/devu.svg)](https://github.com/Hrdtr/devu/releases)

## Features

- **LLM Chat:** Interact with large language models. Supports providers like Anthropic, Google GenAI, Ollama, and OpenAI.
- **Code Playground:** Experiment with code snippets and execute them in a safe environment using Livecodes.
- **Code Snippets:** Create, store, and manage reusable code snippets.
- **Utilities:** Access a collection of useful development utilities such as code formatting, minification, and conversion.

## Planned Features

- **SSH Client**: A built-in SSH client for secure remote access.
- **SFTP**: SFTP support for file transfer.
- **API (REST, WS, etc.) Tester**: A tool to test and debug APIs.

## Download and Installation

Download the latest release from [https://github.com/Hrdtr/devu/releases](https://github.com/Hrdtr/devu/releases). Choose the correct binary/installer for your platform and architecture.

## Contribution

We welcome contributions to Devu! If you'd like to contribute, please follow these guidelines:

- Report issues and suggest enhancements by creating [GitHub Issues](https://github.com/Hrdtr/devu).
- Submit pull requests with clear descriptions of your changes.
- Follow the project's coding standards and best practices.

* Please adhere to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Development

To start the development environment, run the following commands:

\`\`\`bash
bun install
bun dev
\`\`\`

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

${profile.additionalSystemPrompt ? `\n---\n${profile.additionalSystemPrompt}\n` : ''}`,
  })
}
