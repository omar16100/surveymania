import { useEffect, useRef, useState, useCallback } from 'react'

export type SSEEvent = {
  type: string
  data: any
  timestamp: string
}

export type SSEEventHandler = (event: SSEEvent) => void

export interface UseSSEOptions {
  url: string
  onMessage?: SSEEventHandler
  onConnected?: () => void
  onError?: (error: Error) => void
  enabled?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export interface UseSSEReturn {
  isConnected: boolean
  error: Error | null
  reconnect: () => void
  disconnect: () => void
}

/**
 * React hook for Server-Sent Events (SSE) connection
 *
 * @example
 * ```tsx
 * const { isConnected, error } = useSSE({
 *   url: `/api/surveys/${surveyId}/sse`,
 *   onMessage: (event) => {
 *     if (event.type === 'survey:response:new') {
 *       refetchData()
 *     }
 *   },
 *   enabled: true
 * })
 * ```
 */
export function useSSE({
  url,
  onMessage,
  onConnected,
  onError,
  enabled = true,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5
}: UseSSEOptions): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setIsConnected(false)
    reconnectAttemptsRef.current = 0
  }, [])

  const connect = useCallback(() => {
    if (!enabled || eventSourceRef.current) return

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        setError(null)
        reconnectAttemptsRef.current = 0
        console.log('[SSE] Connected to', url)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent

          // Handle connection confirmation
          if (data.type === 'connected') {
            onConnected?.()
            return
          }

          // Ignore heartbeat messages
          if (data.type === 'heartbeat') {
            return
          }

          // Pass message to handler
          onMessage?.(data)
        } catch (err) {
          console.error('[SSE] Failed to parse message:', err)
        }
      }

      eventSource.onerror = (err) => {
        console.error('[SSE] Connection error:', err)

        const error = new Error('SSE connection failed')
        setError(error)
        onError?.(error)

        eventSource.close()
        eventSourceRef.current = null
        setIsConnected(false)

        // Attempt reconnection with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current)
          reconnectAttemptsRef.current++

          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        } else {
          console.error('[SSE] Max reconnection attempts reached')
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create EventSource')
      setError(error)
      onError?.(error)
    }
  }, [url, enabled, onMessage, onConnected, onError, reconnectInterval, maxReconnectAttempts])

  const reconnect = useCallback(() => {
    disconnect()
    reconnectAttemptsRef.current = 0
    connect()
  }, [disconnect, connect])

  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  return {
    isConnected,
    error,
    reconnect,
    disconnect
  }
}

/**
 * Hook specifically for survey SSE updates
 * Provides common survey event handling
 */
export function useSurveySSE(
  surveyId: string,
  onNewResponse?: (response: any) => void,
  onResponseUpdated?: (response: any) => void,
  enabled: boolean = true
): UseSSEReturn {
  return useSSE({
    url: `/api/surveys/${surveyId}/sse`,
    enabled,
    onMessage: (event) => {
      switch (event.type) {
        case 'survey:response:new':
          onNewResponse?.(event.data)
          break
        case 'survey:response:updated':
          onResponseUpdated?.(event.data)
          break
      }
    }
  })
}
