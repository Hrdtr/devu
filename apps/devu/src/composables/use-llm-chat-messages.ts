import type { Chat, Message, Profile } from './use-llm-chat-db'
import { ChatAnthropic } from '@langchain/anthropic'
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages'
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { Ollama } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'
import { useLocalStorage, watchDebounced } from '@vueuse/core'
import { nextTick, onMounted, ref } from 'vue'
import { useLLMChat } from './use-llm-chat'
import { useLLMChatDB } from './use-llm-chat-db'

function createLLMClient(profile: Profile) {
  switch (profile.provider) {
    case 'openai':
      return new ChatOpenAI({
        openAIApiKey: profile.credentials.apiKey,
        configuration: profile.configuration.baseUrl
          ? { baseURL: profile.configuration.baseUrl }
          : undefined,
        modelName: profile.model,
      })
    case 'anthropic':
      return new ChatAnthropic({
        anthropicApiKey: profile.credentials.apiKey,
        modelName: profile.model,
      })
    case 'google-genai':
      return new ChatGoogleGenerativeAI({
        apiKey: profile.credentials.apiKey,
        model: profile.model,
      })
    case 'ollama':
      return new Ollama({
        baseUrl: profile.configuration.baseUrl,
        model: profile.model,
      })
    default:
      throw new Error(`Unknown provider: ${profile.provider}`)
  }
}

function createSystemMessages(profile: Profile) {
  return [
    new SystemMessage(`
    Your name is Devu, user development assistant ready to help with coding tasks, documentation, and more.

    You are integrated inside a desktop software which contains features: 
    - Chat interface
    - Ready to use developer utility collections
    - Code snippets manager (TBD)
    - Language/Code playground (TBD)

    ---
    ${
      profile.additional_system_prompt
        ? `\n${profile.additional_system_prompt}`
        : ''
    }
  `),
  ]
}

export function useLLMChatMessages(chat_id: string) {
  const { updateChat } = useLLMChat()
  const { createId, db } = useLLMChatDB()

  const messages = ref<Message[]>([])
  const loading = ref(false)
  const activeBranches = ref<string[]>([]) // Track active branch path
  const currentBranchId = ref<string | null>(null) // The ID of the *last* branch in the current path
  const state = ref<'idle' | 'pending'>('idle')
  const stopRequested = ref(false) // Flag to signal stream stop

  const retrieveChat = () =>
    db.sql<Chat>`SELECT * FROM chats WHERE id = ${chat_id}`.then(
      ({ rows }) => rows[0],
    )

  watchDebounced(
    activeBranches,
    async () => {
      const chat = await retrieveChat()
      if (!chat)
        return

      updateChat(chat.id, {
        title: chat.title,
        last_message_branch_paths: activeBranches.value,
      })
    },
    { debounce: 500, deep: true },
  )

  // Load messages for a specific chat, following the branch path
  async function loadMessages(
    branch_id: string | null | undefined = undefined,
  ) {
    const chat = await retrieveChat()
    if (!chat) {
      console.error('Chat not found')
      messages.value = [] // Clear messages if chat not found
      activeBranches.value = []
      currentBranchId.value = null
      return
    }

    loading.value = true

    try {
      // Find the last message based on branch_id parameter
      let lastMessage: Message | null = null

      if (!branch_id) {
        // If branch_id is undefined, get the absolute latest message
        lastMessage = await db.sql<Message>`
          SELECT * FROM messages 
          WHERE chat_id = ${chat.id}
          ORDER BY created_at DESC 
          LIMIT 1`.then(({ rows }) => rows[0] || null)
      }
      else {
        // If branch_id is a string, get the latest message with that branch_id
        lastMessage = await db.sql<Message>`
          SELECT * FROM messages 
          WHERE chat_id = ${chat.id} AND branch_id = ${branch_id}
          ORDER BY created_at DESC 
          LIMIT 1`.then(({ rows }) => rows[0] || null)
      }

      // If no message found, try to get the root message
      if (!lastMessage) {
        const rootMessageId = chat.root_message_id
        lastMessage = await db.sql<Message>`
          SELECT * FROM messages 
          WHERE id = ${rootMessageId}`.then(({ rows }) => rows[0] || null)

        if (!lastMessage) {
          console.error('Root message not found')
          loading.value = false
          messages.value = []
          activeBranches.value = []
          currentBranchId.value = null
          return
        }
      }

      // Collect branch IDs while traversing up the chain
      const branchesSet = new Set<string>()
      if (lastMessage.branch_id) {
        branchesSet.add(lastMessage.branch_id)
      }

      // Traverse up from the last message to the root
      const messageChain: Message[] = [lastMessage]
      let currentMessage = lastMessage

      while (currentMessage.parent_id) {
        const parentMessage = await db.sql<Message>`
          SELECT * FROM messages 
          WHERE id = ${currentMessage.parent_id}`.then(({ rows }) => rows[0])

        if (!parentMessage) {
          console.error(`Parent message ${currentMessage.parent_id} not found`)
          break
        }

        messageChain.push(parentMessage)
        if (parentMessage.branch_id) {
          branchesSet.add(parentMessage.branch_id)
        }
        currentMessage = parentMessage
      }

      // Reverse the chain to get it in chronological order
      messageChain.reverse()

      // Set active branches from the collected branches
      activeBranches.value = Array.from(branchesSet)

      // Set current branch ID from the last message
      currentBranchId.value = lastMessage.branch_id

      // Update messages value
      messages.value = messageChain
    }
    catch (error) {
      console.error('Error loading messages:', error)
      messages.value = []
      activeBranches.value = []
      currentBranchId.value = null
    }
    finally {
      loading.value = false
    }
  }

  // Load all available branches for a specific parent_id (a message with multiple children)
  // Returns an array of branch_id strings
  async function getAvailableBranches(parent_id: string): Promise<string[]> {
    const branches = await db.sql<{
      branch_id: string
      created_at: number // Using MIN(created_at) to order branches
    }>`
      SELECT DISTINCT branch_id, MIN(created_at) as created_at FROM messages
      WHERE parent_id = ${parent_id}
      GROUP BY branch_id
      ORDER BY MIN(created_at) DESC`.then(({ rows }) => rows)

    return branches.map(row => row.branch_id)
  }

  // Switch to a different branch starting from a specific parent_id
  async function switchBranch(parent_id: string, branch_id: string) {
    loading.value = true

    try {
      // Find the index of the message with this parent_id in the current view
      const parentIndex = messages.value.findIndex(
        msg => msg.id === parent_id,
      )

      if (parentIndex === -1) {
        console.error(
          `Parent message with id ${parent_id} not found in current messages view.`,
        )
        // Attempt to reload the whole chat to be safe, though this might be unexpected behavior
        await loadMessages()
        return
      }

      // Keep messages up to and including the parent
      const baseMessages = messages.value.slice(0, parentIndex + 1)

      // Reload the rest of the messages from the selected branch
      // We find the first message in the chosen branch and then load the chain from there
      const firstMessageInBranch = await db.sql<Message>`
        SELECT * FROM messages
        WHERE parent_id = ${parent_id} AND branch_id = ${branch_id}
        ORDER BY created_at ASC
        LIMIT 1`.then(({ rows }) => rows[0])

      if (!firstMessageInBranch) {
        console.error(
          `First message in branch ${branch_id} not found for parent ${parent_id}.`,
        )
        loading.value = false
        return
      }

      messages.value = [...baseMessages, firstMessageInBranch]
      await nextTick()

      // Update active branches and current branch ID
      const messagesBranchIds = baseMessages
        .map(m => m.branch_id)
        .filter(Boolean) as string[]
      if (
        firstMessageInBranch.branch_id
        && !messagesBranchIds.includes(firstMessageInBranch.branch_id)
      ) {
        messagesBranchIds.push(firstMessageInBranch.branch_id)
        activeBranches.value = messagesBranchIds
      }
      currentBranchId.value = firstMessageInBranch.branch_id

      // Load the rest of the chain starting from the first message in the new branch
      await loadChainFromMessage(firstMessageInBranch.id)
    }
    catch (error) {
      console.error('Error switching branch:', error)
      // Optionally, attempt to load the default branch on error
      // await loadMessages();
    }
    finally {
      loading.value = false
    }
  }

  // Helper to load the message chain starting from a specific message ID
  // This adds messages to the existing messages.value array
  async function loadChainFromMessage(messageId: string) {
    let currentId = messageId as string | null

    while (currentId) {
      // Find the direct child(ren) of the current message
      const children
        = await db.sql<Message>`SELECT * FROM messages WHERE parent_id = ${currentId} ORDER BY created_at ASC`.then(
          ({ rows }) => rows,
        )

      if (children.length === 0) {
        // No children, chain ends
        break
      }
      else if (children.length === 1) {
        // Only one child, simple path
        const nextMessage = children[0]
        messages.value.push(nextMessage)
        await nextTick()
        currentId = nextMessage.id

        // Update branch tracking if the next message has a branch_id
        if (nextMessage.branch_id) {
          if (!activeBranches.value.includes(nextMessage.branch_id)) {
            activeBranches.value.push(nextMessage.branch_id)
          }
          currentBranchId.value = nextMessage.branch_id
        }
      }
      else {
        // Multiple children - this indicates a branching point encountered during chain loading.
        // We should follow the branch_id that was used to start this chain loading process
        // (i.e., the branch_id of the first message we added in switchBranch or loadMessages).
        // Need to find the child whose branch_id matches the currentBranchId.value
        const nextMessageInBranch = await db.sql<Message>`
          SELECT * FROM messages
          WHERE parent_id = ${currentId} AND branch_id = ${currentBranchId.value}
          ORDER BY created_at ASC
          LIMIT 1`.then(({ rows }) => rows[0])

        if (nextMessageInBranch) {
          const nextMessage = nextMessageInBranch
          messages.value.push(nextMessage)
          await nextTick()
          currentId = nextMessage.id
          // currentBranchId is already correct from the parent message
        }
        else {
          // This shouldn't happen if currentBranchId is valid and messages exist
          // But if it does, we have lost the thread, so break.
          console.warn(
            `Could not find message in branch ${currentBranchId.value} for parent ${currentId} while loading chain.`,
          )
          currentId = null // End the loop
        }
      }
    }
  }

  // Send a message and get AI response with streaming
  async function sendMessage(content: string, profile: Profile) {
    const chat = await retrieveChat()
    if (!chat || !content.trim())
      return

    state.value = 'pending'

    try {
      // Find the last message to determine parent
      const lastMessage = messages.value[messages.value.length - 1]
      const parent_id = lastMessage?.id || null

      // Create IDs for user and AI messages
      const userMessageId
        = messages.value.length === 0 ? chat.root_message_id : createId()
      if (!userMessageId) {
        state.value = 'idle'
        return
      }
      const aiMessageId = createId()

      // New messages extend the current active branch
      if (!currentBranchId.value) {
        currentBranchId.value = createId()
      }

      // Insert user message into DB
      const userMessage = await db.sql<Message>`
        INSERT INTO messages (id, chat_id, parent_id, role, content, branch_id, metadata)
        VALUES (${userMessageId}, ${
          chat.id
        }, ${parent_id}, ${'user'}, ${content}, ${currentBranchId.value}, ${{}})
        RETURNING *`.then(({ rows }) => rows[0])

      // Add user message to local state immediately
      messages.value.push(userMessage)
      await nextTick()

      // Add AI placeholder message to local state immediately
      const aiMessagePlaceholder: Message = {
        id: aiMessageId, // Assign the final ID now
        created_at: new Date(), // Use current time for placeholder
        chat_id: chat.id,
        parent_id: userMessageId,
        role: 'assistant',
        content: '', // Start with empty content
        branch_id: currentBranchId.value, // Inherit the branch_id
        metadata: {
          provider: profile.provider,
          model: profile.model,
        },
      }
      messages.value.push(aiMessagePlaceholder)
      await nextTick()

      // Create LLM client (streaming should be enabled in createLLMClient)
      const llmClient = createLLMClient(profile)

      // Prepare conversation history up to the *newly added user message*
      const history = [
        ...createSystemMessages(profile),
        ...messages.value
          .filter(msg => msg.content && msg.content.trim() !== '')
          .map(msg =>
            msg.role === 'user'
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content),
          ),
      ]

      // Stream AI response
      let receivedContent = ''
      const aiMessageIndex = messages.value.findIndex(
        msg => msg.id === aiMessageId,
      )

      try {
        const stream = await llmClient.stream(history)

        for await (const chunk of stream) {
          if (stopRequested.value) {
            receivedContent
              += '\n\n<p class="text-muted-foreground">Stream stopped by user.</p>'
            if (aiMessageIndex !== -1) {
              messages.value[aiMessageIndex].content = receivedContent
            }
            stopRequested.value = false // Reset flag
            break // Exit the loop
          }
          await nextTick()
          receivedContent
            += typeof chunk === 'string' ? chunk : chunk.content.toString()
          // Update the content of the placeholder message in the local state
          if (aiMessageIndex !== -1) {
            messages.value[aiMessageIndex].content = receivedContent
          }
        }
      }
      catch (streamError) {
        console.error('Error during streaming:', streamError)
        // Update placeholder with an error message
        if (aiMessageIndex !== -1) {
          messages.value[aiMessageIndex].content
            = (streamError as Error).message || 'Streaming failed'
          // messages.value[aiMessageIndex].model = "error"; // Indicate error state
        }
        state.value = 'idle'
        // throw streamError; // Propagate error
      }

      // Save complete AI response to database
      const finalAiMessage = messages.value[aiMessageIndex] // Get the message with full content
      if (
        finalAiMessage
        && finalAiMessage.role === 'assistant' /*  && */
        // finalAiMessage.model !== "error"
      ) {
        // Only save if it's a successful assistant message
        const message = await db.sql<Message>`
          INSERT INTO messages (id, chat_id, parent_id, role, content, branch_id, metadata)
          VALUES (${finalAiMessage.id}, ${chat.id}, ${finalAiMessage.parent_id}, ${finalAiMessage.role}, ${finalAiMessage.content}, ${finalAiMessage.branch_id}, ${finalAiMessage.metadata})
          RETURNING *`.then(({ rows }) => rows[0])

        // Update the created_at in the local message to the DB save time
        messages.value[aiMessageIndex].created_at = message.created_at
      }

      // If we don't have a title yet (first exchange), generate one
      // Check total messages *after* adding user and assistant
      if (messages.value.length === 2) {
        const currentChatTitle = chat.title

        if (!currentChatTitle || currentChatTitle === '') {
          const res = await llmClient.invoke([
            ...messages.value,
            new HumanMessage(
              'SYSTEM INSTRUCTION:\nGenerate a concise title for this conversation. Reply with only the title, avoiding special characters, formatting, or prefixes like \'A conversation...\'.',
            ),
          ])
          await updateChat(chat.id, {
            title: typeof res === 'string' ? res : res.content.toString(),
            last_message_branch_paths: [...chat.last_message_branch_paths],
          })
        }
      }

      return finalAiMessage // Return the complete AI message
    }
    catch (error) {
      console.error('Error sending message:', error)
      // The streaming catch block handles updating the local message for streaming errors.
      // This outer catch handles errors before or after streaming (like DB errors).
      // Ensure state is false even if streaming catch didn't run.
      state.value = 'idle'
      throw error // Propagate the error
    }
    finally {
      state.value = 'idle'
    }
  }

  // Regenerate an AI message, creating a new branch and streaming the response
  async function regenerateMessage(messageId: string, profile: Profile) {
    const chat = await retrieveChat()
    if (!chat)
      return

    // Find message to regenerate
    const messageIndex = messages.value.findIndex(m => m.id === messageId)
    if (
      messageIndex === -1
      || messages.value[messageIndex].role !== 'assistant'
    ) {
      console.error(
        'Cannot regenerate: message not found or not an AI message',
      )
      return
    }

    // Get the parent message (user message that prompted this AI response)
    const parentMessage = messages.value.find(
      m => m.id === messages.value[messageIndex].parent_id,
    )
    if (!parentMessage) {
      console.error('Parent message not found for regeneration')
      return
    }

    state.value = 'pending'

    try {
      // Create a new branch ID for the regenerated response
      const newBranchId = createId()
      const newAiMessageId = createId() // ID for the new AI message

      // Create conversation history up to and including the parent (user) message
      // This history should be based on the messages *before* the message being regenerated
      const historyEndIndex = messages.value.findIndex(
        msg => msg.id === parentMessage.id,
      )

      const history = [
        ...createSystemMessages(profile),
        ...messages.value
          .slice(0, historyEndIndex + 1) // Include the parent message
          .filter(msg => msg.content && msg.content.trim() !== '')
          .map(msg =>
            msg.role === 'user'
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content),
          ),
      ]

      // Create LLM client
      const llmClient = createLLMClient(profile)

      // Create a temporary message object to stream into
      const newAiMessagePlaceholder: Message = {
        id: newAiMessageId,
        created_at: new Date(),
        chat_id: chat.id,
        parent_id: parentMessage.id,
        role: 'assistant',
        content: '', // Start empty
        branch_id: newBranchId, // Assign the new branch ID
        metadata: {
          provider: profile.provider,
          model: profile.model,
        },
      }

      // Stream AI response into the temporary object
      let receivedContent = ''
      try {
        const stream = await llmClient.stream(history)
        if (messages.value[messageIndex]) {
          messages.value[messageIndex] = newAiMessagePlaceholder
        }
        await nextTick()

        for await (const chunk of stream) {
          if (stopRequested.value) {
            receivedContent
              += '\n<p class="text-muted-foreground">Stream stopped by user.</p>'
            if (messages.value[messageIndex]) {
              messages.value[messageIndex].content = receivedContent
            }
            newAiMessagePlaceholder.content = receivedContent
            stopRequested.value = false // Reset flag
            break // Exit loop
          }
          await nextTick()
          receivedContent
            += typeof chunk === 'string' ? chunk : chunk.content.toString()
          if (messages.value[messageIndex]) {
            messages.value[messageIndex].content = receivedContent
          }
          newAiMessagePlaceholder.content = receivedContent
        }

        newAiMessagePlaceholder.content = receivedContent // Ensure temp object has final content
      }
      catch (streamError) {
        console.error('Error during regeneration streaming:', streamError)
        if (messages.value[messageIndex]) {
          messages.value[messageIndex].content
            = (streamError as Error).message || 'Streaming failed'
          await nextTick()
        }
        newAiMessagePlaceholder.content
          = (streamError as Error).message || 'Streaming failed'
        state.value = 'idle'
        // throw streamError; // Propagate error
      }

      // Save the complete new AI response to database
      await db.sql`
        INSERT INTO messages (id, chat_id, parent_id, role, content, branch_id, metadata)
        VALUES (${newAiMessagePlaceholder.id}, ${chat.id}, ${newAiMessagePlaceholder.parent_id}, ${newAiMessagePlaceholder.role}, ${newAiMessagePlaceholder.content}, ${newAiMessagePlaceholder.branch_id}, ${newAiMessagePlaceholder.metadata})`

      // Switch to the new branch to display the regenerated message
      await switchBranch(parentMessage.id, newBranchId)

      // Find and return the newly added AI message in the updated messages list
      return messages.value.find(m => m.id === newAiMessageId)
    }
    catch (error) {
      console.error('Error regenerating message:', error)
      state.value = 'idle'
      throw error
    }
    finally {
      state.value = 'idle'
    }
  }

  // Edit a user message, creating a new branch and streaming the AI response
  async function editMessage(id: string, newContent: string, profile: Profile) {
    const chat = await retrieveChat()
    if (!chat || !newContent.trim())
      return

    // Find message to edit
    const messageIndex = messages.value.findIndex(m => m.id === id)
    if (messageIndex === -1 || messages.value[messageIndex].role !== 'user') {
      console.error('Cannot edit: message not found or not a user message')
      return
    }

    state.value = 'pending'

    try {
      // Get the parent of the message being edited
      const originalMessage = messages.value[messageIndex]
      const parent_id = originalMessage.parent_id! // Can be null for the root message

      // Create a new branch ID for the edited message and its subsequent response
      const newBranchId = createId()
      const editedMessageId = createId() // ID for the new user message
      const newAiMessageId = createId() // ID for the new AI message

      // Create conversation history up to the message *before* the one being edited
      const history = [
        ...createSystemMessages(profile),
        ...messages.value
          .slice(0, messageIndex) // Exclude the message being edited
          .filter(msg => msg.content && msg.content.trim() !== '')
          .map(msg =>
            msg.role === 'user'
              ? new HumanMessage(msg.content)
              : new AIMessage(msg.content),
          ),
      ]

      // Add the *edited* user message content to the history for the LLM call
      history.push(new HumanMessage(newContent))

      // Insert the edited user message into the DB
      const editedMessage = await db.sql<Message>`
        INSERT INTO messages (id, chat_id, parent_id, role, content, branch_id, metadata)
        VALUES (${editedMessageId}, ${
          chat.id
        }, ${parent_id}, ${'user'}, ${newContent}, ${newBranchId}, ${{}})
        RETURNING *`.then(({ rows }) => rows[0])

      // Create LLM client
      const llmClient = createLLMClient(profile)

      // Create a temporary AI message object to stream into
      const newAiMessagePlaceholder: Message = {
        id: newAiMessageId,
        created_at: new Date(),
        chat_id: chat.id,
        parent_id: editedMessageId, // Parent is the new edited user message
        role: 'assistant',
        content: '', // Start empty
        branch_id: newBranchId, // Inherit the new branch ID
        metadata: {
          provider: profile.provider,
          model: profile.model,
        },
      }

      // Stream AI response into the temporary object
      let receivedContent = ''
      try {
        const stream = await llmClient.stream(history)
        messages.value = [
          ...messages.value.slice(0, messageIndex),
          editedMessage,
          newAiMessagePlaceholder,
        ]

        for await (const chunk of stream) {
          if (stopRequested.value) {
            receivedContent
              += '\n<p class="text-muted-foreground">Stream stopped by user.</p>'
            if (messages.value[messages.value.length - 1]) {
              messages.value[messages.value.length - 1].content
                = receivedContent
            }
            newAiMessagePlaceholder.content = receivedContent
            stopRequested.value = false // Reset flag
            break // Exit loop
          }
          await nextTick()
          receivedContent
            += typeof chunk === 'string' ? chunk : chunk.content.toString()
          if (messages.value[messages.value.length - 1]) {
            messages.value[messages.value.length - 1].content = receivedContent
          }
          newAiMessagePlaceholder.content = receivedContent
        }

        newAiMessagePlaceholder.content = receivedContent // Ensure temp object has final content
      }
      catch (streamError) {
        console.error('Error during edit streaming:', streamError)
        if (messages.value[messages.value.length - 1]) {
          messages.value[messages.value.length - 1].content
            = (streamError as Error).message || 'Streaming failed'
          await nextTick()
        }
        newAiMessagePlaceholder.content
          = (streamError as Error).message || 'Streaming failed'
        state.value = 'idle'
        // throw streamError; // Propagate error
      }

      // Save the complete new AI response to database
      await db.sql`
        INSERT INTO messages (id, chat_id, parent_id, role, content, branch_id, metadata)
        VALUES (${newAiMessagePlaceholder.id}, ${chat.id}, ${newAiMessagePlaceholder.parent_id}, ${newAiMessagePlaceholder.role}, ${newAiMessagePlaceholder.content}, ${newAiMessagePlaceholder.branch_id}, ${newAiMessagePlaceholder.metadata})`

      // Switch to the new branch starting from the parent of the original edited message
      await switchBranch(parent_id, newBranchId)

      // Find and return the newly added AI message in the updated messages list
      return messages.value.find(m => m.id === newAiMessageId)
    }
    catch (error) {
      console.error('Error editing message:', error)
      state.value = 'idle'
      throw error
    }
    finally {
      state.value = 'idle'
    }
  }

  // Stop the current generation stream
  function stopActiveMessageStream() {
    if (state.value === 'pending' && !stopRequested.value) {
      stopRequested.value = true
      // The streaming loop's check will handle appending text, saving, and resetting state.
    }
  }

  // Initial load when chat_id becomes available
  const initialChatPayload = useLocalStorage('initialChatPayload', '')
  onMounted(async () => {
    // Prevent refresh the reactive messages array on initial chat
    if (!initialChatPayload.value && chat_id !== 'new') {
      const chat = await retrieveChat()
      const lastMessageBranchPaths = chat?.last_message_branch_paths
      if (lastMessageBranchPaths && lastMessageBranchPaths.length > 0) {
        await loadMessages(
          lastMessageBranchPaths[lastMessageBranchPaths.length - 1],
        )
      }
      else {
        await loadMessages()
      }
    }
  })

  return {
    messages,
    loading,
    activeBranches,
    currentBranchId,
    state,
    loadMessages,
    sendMessage,
    regenerateMessage,
    editMessage,
    switchBranch,
    getAvailableBranches,
    stopActiveMessageStream,
  }
}
