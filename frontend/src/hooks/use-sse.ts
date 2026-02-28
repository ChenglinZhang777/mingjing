import { useState, useCallback, useRef } from 'react'
import { streamFetch } from '@/lib/sse-client'

interface UseSSEOptions {
  url: string
  onEvent: (event: string, data: unknown) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

interface UseSSEReturn {
  isStreaming: boolean
  error: Error | null
  startStream: (body: unknown) => Promise<void>
  abortStream: () => void
}

export function useSSE({ url, onEvent, onError, onComplete }: UseSSEOptions): UseSSEReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef(false)

  const abortStream = useCallback(() => {
    abortRef.current = true
  }, [])

  const startStream = useCallback(
    async (body: unknown) => {
      const token = localStorage.getItem('token')
      if (!token) {
        const err = new Error('未登录，请先登录')
        setError(err)
        onError?.(err)
        return
      }

      setIsStreaming(true)
      setError(null)
      abortRef.current = false

      try {
        await streamFetch(url, body, token, (event, data) => {
          if (abortRef.current) return
          onEvent(event, data)
        })
        onComplete?.()
      } catch (err) {
        const error = err instanceof Error ? err : new Error('流式请求失败')
        if (!abortRef.current) {
          setError(error)
          onError?.(error)
        }
      } finally {
        setIsStreaming(false)
      }
    },
    [url, onEvent, onError, onComplete],
  )

  return { isStreaming, error, startStream, abortStream }
}
