import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  baseURL: process.env['ANTHROPIC_BASE_URL'] ?? 'https://api.minimaxi.com/anthropic',
  apiKey: process.env['ANTHROPIC_API_KEY'],
})

const DEFAULT_MODEL = 'MiniMax-M2.5'
const AI_TIMEOUT_MS = 120_000 // 120s timeout for AI calls

interface StreamChatParams {
  systemPrompt: string
  userMessage: string
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  onChunk: (chunk: string) => void
  onDone: (fullResponse: string) => void
  signal?: AbortSignal
}

export async function streamChat(params: StreamChatParams): Promise<void> {
  const { systemPrompt, userMessage, messages = [], onChunk, onDone, signal } = params

  const model = process.env['AI_MODEL'] ?? DEFAULT_MODEL

  const apiMessages: Anthropic.MessageParam[] = [
    ...messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ]

  const abortController = new AbortController()

  // Link external signal if provided
  if (signal) {
    if (signal.aborted) {
      throw new Error('请求已取消')
    }
    signal.addEventListener('abort', () => abortController.abort(), { once: true })
  }

  // Enforce timeout
  const timeoutId = setTimeout(() => abortController.abort(), AI_TIMEOUT_MS)

  try {
    const stream = client.messages.stream(
      {
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: apiMessages,
      },
      { signal: abortController.signal },
    )

    let fullText = ''

    stream.on('text', (text) => {
      fullText += text
      onChunk(text)
    })

    const finalMessage = await stream.finalMessage()

    const contentBlock = finalMessage.content[0]
    if (contentBlock?.type === 'text') {
      fullText = contentBlock.text
    }

    onDone(fullText)
  } finally {
    clearTimeout(timeoutId)
  }
}
