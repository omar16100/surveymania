import { NextRequest } from 'next/server'
import { subscribeToChannel } from '@/lib/sse'


type Params = { params: { id: string } }

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: Params) {
  const surveyId = params.id

  // Create a TransformStream for SSE
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()
  const encoder = new TextEncoder()

  // Send SSE message helper
  const sendMessage = (data: any) => {
    const message = `data: ${JSON.stringify(data)}\n\n`
    writer.write(encoder.encode(message))
  }

  // Subscribe to the survey channel
  const channelName = `survey.${surveyId}`
  const unsubscribe = subscribeToChannel(channelName, (event) => {
    sendMessage(event)
  })

  // Send initial connection message
  sendMessage({ type: 'connected', data: { surveyId } })

  // Heartbeat to keep connection alive (every 30 seconds)
  const heartbeatInterval = setInterval(() => {
    sendMessage({ type: 'heartbeat', data: { timestamp: new Date().toISOString() } })
  }, 30000)

  // Clean up on disconnect
  req.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval)
    unsubscribe()
    writer.close()
  })

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering for nginx
    },
  })
}
