import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types/rehearsal'

interface MessageBubbleProps {
  message: ChatMessage
  isStreaming?: boolean
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const seconds = Math.floor(diff / 1000)

  if (seconds < 60) return '刚刚'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`

  return `${Math.floor(hours / 24)} 天前`
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <Bot className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Bubble */}
      <div className={cn('flex max-w-[75%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'rounded-br-md bg-primary text-primary-foreground'
              : 'rounded-bl-md bg-muted text-foreground',
          )}
        >
          {message.content}
          {isStreaming && (
            <span className="ml-0.5 inline-block animate-pulse text-current">▌</span>
          )}
        </div>
        <span className="px-1 text-xs text-muted-foreground">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>
    </div>
  )
}
