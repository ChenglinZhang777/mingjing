export interface SSEEvent {
  event: string
  data: unknown
}

/**
 * fetch-based SSE client — supports POST + Authorization header
 * (EventSource only supports GET without custom headers)
 */
export async function streamFetch(
  url: string,
  body: unknown,
  token: string,
  onChunk: (event: string, data: unknown) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    let message = `请求失败 (${response.status})`
    try {
      const parsed = JSON.parse(errorText) as { error?: { message?: string } }
      if (parsed.error?.message) {
        message = parsed.error.message
      }
    } catch {
      // use default message
    }
    throw new Error(message)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('响应不支持流式读取')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      // Keep the last incomplete line in buffer
      buffer = lines.pop() ?? ''

      let currentEvent = 'message'

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          const rawData = line.slice(6)
          try {
            const parsed: unknown = JSON.parse(rawData)
            onChunk(currentEvent, parsed)
          } catch {
            onChunk(currentEvent, rawData)
          }
          currentEvent = 'message'
        }
        // Skip empty lines and comments
      }
    }
  } finally {
    reader.releaseLock()
  }
}
