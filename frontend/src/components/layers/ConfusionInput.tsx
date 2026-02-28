import { useState } from 'react'
import { cn } from '@/lib/utils'

const MIN_LENGTH = 50
const MAX_LENGTH = 500
const PLACEHOLDER =
  '描述你的职业困惑，例如：我在当前公司做了 3 年，感觉学不到新东西，但跳槽又担心新环境不适应...'

interface ConfusionInputProps {
  onSubmit: (text: string) => void
  disabled?: boolean
}

export function ConfusionInput({ onSubmit, disabled = false }: ConfusionInputProps) {
  const [text, setText] = useState('')

  const charCount = text.length
  const isTooShort = charCount > 0 && charCount < MIN_LENGTH
  const isTooLong = charCount > MAX_LENGTH
  const isValid = charCount >= MIN_LENGTH && charCount <= MAX_LENGTH

  function handleSubmit() {
    if (!isValid || disabled) return
    onSubmit(text.trim())
  }

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        disabled={disabled}
        rows={6}
        className={cn(
          'w-full resize-none rounded-lg border bg-background px-4 py-3 text-base leading-relaxed',
          'placeholder:text-muted-foreground/60',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isTooLong && 'border-destructive focus:ring-destructive',
        )}
      />

      <div className="flex items-center justify-between">
        <p
          className={cn(
            'text-sm',
            isTooShort && 'text-amber-600',
            isTooLong && 'text-destructive',
            !isTooShort && !isTooLong && 'text-muted-foreground',
          )}
        >
          {charCount}/{MAX_LENGTH} 字
          {isTooShort && `（建议至少 ${MIN_LENGTH} 字）`}
          {isTooLong && '（超出字数限制）'}
        </p>

        <button
          onClick={handleSubmit}
          disabled={!isValid || disabled}
          className={cn(
            'rounded-lg px-6 py-2.5 text-sm font-medium transition-colors',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          开始剖析
        </button>
      </div>
    </div>
  )
}
