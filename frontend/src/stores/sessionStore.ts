import { create } from 'zustand'

import type { MessageRead } from '@/types/messages'

interface SessionStore {
  messages: MessageRead[]
  streamingContent: string
  isStreaming: boolean
  setMessages: (messages: MessageRead[]) => void
  addUserMessage: (content: string) => void
  startStreaming: () => void
  appendStreamChunk: (chunk: string) => void
  finishStreaming: (messageId: string, content: string) => void
  resetStreaming: () => void
  clear: () => void
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  messages: [],
  streamingContent: '',
  isStreaming: false,

  setMessages: (messages) => set({ messages }),

  addUserMessage: (content) => {
    const message: MessageRead = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    set({ messages: [...get().messages, message] })
  },

  startStreaming: () => set({ isStreaming: true, streamingContent: '' }),

  appendStreamChunk: (chunk) =>
    set({ streamingContent: get().streamingContent + chunk }),

  finishStreaming: (messageId, content) => {
    const message: MessageRead = {
      id: messageId,
      role: 'assistant',
      content,
      created_at: new Date().toISOString(),
    }
    set({
      messages: [...get().messages, message],
      streamingContent: '',
      isStreaming: false,
    })
  },

  resetStreaming: () => set({ streamingContent: '', isStreaming: false }),

  clear: () => set({ messages: [], streamingContent: '', isStreaming: false }),
}))
