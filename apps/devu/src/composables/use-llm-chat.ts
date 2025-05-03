import type { Chat } from './use-llm-chat-db'
import { createSharedComposable } from '@vueuse/core'
import { computed } from 'vue'
import { useLLMChatDB } from './use-llm-chat-db'

export function _useLLMChat() {
  const { createId, liveQuery, db } = useLLMChatDB()

  const {
    rows,
  } = liveQuery.sql<Chat>`SELECT * FROM chats ORDER BY created_at DESC`

  const chats = computed(() => rows.value || [])

  async function createChat() {
    const chat = await db.sql<Chat>`
      INSERT INTO chats (id, root_message_id)
      VALUES (${createId()}, ${createId()})
      RETURNING *`.then(({ rows }) => rows[0])

    return chat
  }

  async function updateChat(
    id: string,
    {
      title,
      last_message_branch_paths,
    }: Pick<Chat, 'title' | 'last_message_branch_paths'>,
  ) {
    const chat = await db.sql<Chat>`
      UPDATE chats SET title = ${title}, last_message_branch_paths = ${last_message_branch_paths}
      WHERE id = ${id}
      RETURNING *`.then(({ rows }) => rows[0])

    return chat
  }

  async function deleteChat(id: string) {
    await db.sql`DELETE FROM messages WHERE chat_id = ${id}`
    await db.sql`DELETE FROM chats WHERE id = ${id}`
    return { id }
  }

  return {
    chats,
    createChat,
    updateChat,
    deleteChat,
  }
}
export const useLLMChat = createSharedComposable(_useLLMChat)
