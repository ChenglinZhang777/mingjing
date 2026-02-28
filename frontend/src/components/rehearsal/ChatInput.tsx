import { useState, useCallback, useRef, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (content: string) => void
  isLoading: boolean
  disabled?: boolean
}

const MAX_LENGTH = 500
const MIN_LENGTH = 20

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const trimmed = value.trim()
  const canSend = trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH && !isLoading && !disabled

  const handleSend = useCallback(() => {
    if (!canSend) return
    onSend(trimmed)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [canSend, trimmed, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [])

  const charCount = trimmed.length

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              handleInput()
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入你的回答… (Shift+Enter 换行)"
            disabled={isLoading || disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-lg border bg-background px-4 py-3 pr-12 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          />
        </div>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors',
            canSend
              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>Enter 发送，Shift+Enter 换行</span>
        <span className={cn(charCount > MAX_LENGTH && 'text-red-500')}>
          {charCount > 0 && `${charCount}/${MAX_LENGTH}`}
        </span>
      </div>
    </div>
  )
}
