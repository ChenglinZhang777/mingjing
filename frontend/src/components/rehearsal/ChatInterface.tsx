import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import type { ChatMessage } from '@/types/rehearsal'

interface ChatInterfaceProps {
  messages: ChatMessage[]
  isLoading: boolean
  onSend: (content: string) => void
  onEnd: () => void
  roundNumber: number
  maxRounds?: number
  streamingMessageIndex?: number
}

const DEFAULT_MAX_ROUNDS = 8
const MIN_ROUNDS_FOR_END = 3

export function ChatInterface({
  messages,
  isLoading,
  onSend,
  onEnd,
  roundNumber,
  maxRounds = DEFAULT_MAX_ROUNDS,
  streamingMessageIndex,
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [messages, isLoading])

  const canEnd = roundNumber >= MIN_ROUNDS_FOR_END

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="text-sm text-muted-foreground">
          第 {roundNumber} 轮 / 最多 {maxRounds} 轮
        </span>
        <button
          type="button"
          onClick={onEnd}
          disabled={isLoading || !canEnd}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            canEnd && !isLoading
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'cursor-not-allowed text-muted-foreground',
          )}
        >
          结束面试
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={`${msg.role}-${idx}`}
            message={msg}
            isStreaming={idx === streamingMessageIndex}
          />
        ))}

        {/* Loading indicator when waiting for AI response */}
        {isLoading && streamingMessageIndex === undefined && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <span className="text-xs">🤖</span>
            </div>
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-2.5">
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:0ms]" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:150ms]" />
              <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-muted-foreground/40 [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={onSend} isLoading={isLoading} />
    </div>
  )
}
