import type { components } from '@/types/api.generated'

export type MessageRead = components['schemas']['MessageRead']
export type MessageCreate = components['schemas']['MessageCreate']

export interface UndoLastTurnResponse {
  messages: MessageRead[]
}
