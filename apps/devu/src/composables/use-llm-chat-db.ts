import type { PGliteInterfaceExtensions } from '@electric-sql/pglite'
import { PGlite } from '@electric-sql/pglite'
import {
  makePGliteDependencyInjector,
  useLiveIncrementalQuery,
  useLiveQuery,
} from '@electric-sql/pglite-vue'
import { live } from '@electric-sql/pglite/live'
import { vector } from '@electric-sql/pglite/vector'

const { providePGlite, injectPGlite } = makePGliteDependencyInjector<
  PGlite &
  PGliteInterfaceExtensions<{
    live: typeof live
    vector: typeof vector
  }>
>()

function _useLLMChatDB() {
  const db = injectPGlite()
  if (!db) {
    throw new Error(
      '`useLLMChatDB` must be used inside component which calls `useLLMChatDB.provide()`',
    )
  }

  return {
    db,
    liveIncrementalQuery: useLiveIncrementalQuery,
    liveQuery: useLiveQuery,
    createId: () => crypto.randomUUID(),
  }
}

export type LLMProvider = 'openai' | 'anthropic' | 'google-genai' | 'ollama'

export interface Profile {
  id: string
  created_at: Date
  last_updated_at: Date
  name: string
  provider: LLMProvider
  configuration: Record<string, any>
  credentials: Record<string, any>
  model: string
  additional_system_prompt: string | null
}

export interface Chat {
  id: string
  created_at: Date
  last_updated_at: Date
  title: string | null
  root_message_id: string
  last_message_branch_paths: string[]
}

export interface Message {
  id: string
  created_at: Date
  chat_id: string
  parent_id: string | null
  role: 'user' | 'assistant'
  content: string
  branch_id: string
  metadata: Record<string, any>
}

const migrations = [
  {
    name: 'initial',
    sql: `
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_updated_at TIMESTAMPTZ,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        configuration JSONB NOT NULL DEFAULT '{}',
        credentials JSONB NOT NULL DEFAULT '{}',
        model TEXT NOT NULL,
        additional_system_prompt TEXT
      );

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_updated_at TIMESTAMPTZ,
        title TEXT,
        root_message_id TEXT NOT NULL,
        last_message_branch_paths TEXT[] NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        chat_id TEXT NOT NULL,
        parent_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        branch_id TEXT NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'
      );`,
  },
]

_useLLMChatDB.initialize = async () => {
  const db = await PGlite.create('idb://llm-chat', {
    extensions: { live, vector },
    relaxedDurability: true,
  })

  for (const migration of migrations) {
    console.info('[llm-chat-db] Running migration:', migration.name)
    await db.exec(migration.sql)
  }

  return {
    db,
    provide: providePGlite,
  }
}

export const useLLMChatDB = _useLLMChatDB
