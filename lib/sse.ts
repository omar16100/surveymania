// Server-Sent Events (SSE) infrastructure
// In-memory pub/sub for real-time updates

type SSECallback = (data: any) => void

// Map of channel names to subscribers
const channels = new Map<string, Set<SSECallback>>()

// Subscribe to a channel
export function subscribeToChannel(channelName: string, callback: SSECallback): () => void {
  if (!channels.has(channelName)) {
    channels.set(channelName, new Set())
  }

  channels.get(channelName)!.add(callback)

  // Return unsubscribe function
  return () => {
    const subscribers = channels.get(channelName)
    if (subscribers) {
      subscribers.delete(callback)
      if (subscribers.size === 0) {
        channels.delete(channelName)
      }
    }
  }
}

// Publish event to all subscribers of a channel
export function publishToChannel(channelName: string, eventType: string, data: any): void {
  const subscribers = channels.get(channelName)
  if (!subscribers || subscribers.size === 0) {
    return
  }

  const payload = {
    type: eventType,
    data,
    timestamp: new Date().toISOString()
  }

  subscribers.forEach(callback => {
    try {
      callback(payload)
    } catch (error) {
      console.error('SSE callback error:', error)
    }
  })
}

// Get subscriber count for a channel (useful for debugging)
export function getChannelSubscriberCount(channelName: string): number {
  return channels.get(channelName)?.size || 0
}

// Event types for type safety
export type SSEEvent =
  | { type: 'survey:response:new'; data: ResponseNewEvent }
  | { type: 'survey:response:updated'; data: ResponseUpdatedEvent }
  | { type: 'campaign:member:joined'; data: MemberJoinedEvent }

export type ResponseNewEvent = {
  id: string
  surveyId: string
  sessionId: string
  status: string
  submittedAt: string | null
  latitude: number | null
  longitude: number | null
  answers: Array<{
    questionId: string
    answerType: string
    answerText: string | null
    answerNumber: number | null
    answerChoices: string[]
  }>
}

export type ResponseUpdatedEvent = {
  id: string
  surveyId: string
  [key: string]: any
}

export type MemberJoinedEvent = {
  id: string
  campaignId: string
  userId: string
  role: string
}
