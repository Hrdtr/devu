import { createAgent } from './create-agent'

// Source: https://mastra.ai/en/reference/agents/stream#messages
interface AgentMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
class Message implements AgentMessage {
  role: 'system' | 'user' | 'assistant'
  content: string

  constructor({ role, content }: AgentMessage) {
    this.role = role
    this.content = content
  }
}

export const llmChat = {
  createAgent,
  Message,
}
