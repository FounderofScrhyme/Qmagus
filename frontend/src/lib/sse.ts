export interface SseEvent {
  event: string
  data: string
}

export function parseSseChunk(buffer: string): { events: SseEvent[]; remaining: string } {
  const events: SseEvent[] = []
  const blocks = buffer.split('\n\n')
  const remaining = blocks.pop() ?? ''

  for (const block of blocks) {
    if (!block.trim()) continue

    let event = 'message'
    let data = ''

    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        data = line.slice(5).trim()
      }
    }

    events.push({ event, data })
  }

  return { events, remaining }
}
