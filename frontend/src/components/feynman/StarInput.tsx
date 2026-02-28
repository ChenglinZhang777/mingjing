import { useState } from 'react'
import { ChevronDown, Loader2, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StarGuide } from './StarGuide'

interface StarInputProps {
  onSubmit: (story: string) => void
  isLoading: boolean
  disabled?: boolean
}

const MIN_CHARS = 50
const RECOMMENDED_MIN = 200
const RECOMMENDED_MAX = 800

export function StarInput({ onSubmit, isLoading, disabled }: StarInputProps) {
  const [story, setStory] = useState('')
  const [showGuide, setShowGuide] = useState(false)

  const charCount = story.length
  const canSubmit = charCount >= MIN_CHARS && !isLoading && !disabled

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit(story)
  }

  const getCharCountColor = (): string => {
    if (charCount < MIN_CHARS) return 'text-red-500'
    if (charCount < RECOMMENDED_MIN) return 'text-amber-500'
    if (charCount > RECOMMENDED_MAX) return 'text-amber-500'
    return 'text-emerald-600'
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="请输入你的 STAR 故事...&#10;&#10;描述一段你在工作中解决问题或取得成果的经历，包含情境（Situation）、任务（Task）、行动（Action）和结果（Result）四个要素。"
          disabled={isLoading || disabled}
          className={cn(
            'min-h-[200px] w-full resize-y rounded-lg border bg-background p-4 text-sm leading-relaxed',
            'placeholder:text-muted-foreground/60',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={getCharCountColor()}>
            {charCount} 字
            {charCount < MIN_CHARS && ` (至少 ${MIN_CHARS} 字)`}
            {charCount >= MIN_CHARS && charCount < RECOMMENDED_MIN && ' (建议 200 字以上)'}
            {charCount > RECOMMENDED_MAX && ' (建议 800 字以内)'}
          </span>
          <span className="text-muted-foreground">建议 {RECOMMENDED_MIN}-{RECOMMENDED_MAX} 字</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setShowGuide((prev) => !prev)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          查看 STAR 框架指南
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', showGuide && 'rotate-180')}
          />
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-medium transition-colors',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              开始分析
            </>
          )}
        </button>
      </div>

      {showGuide && (
        <div className="pt-2">
          <StarGuide />
        </div>
      )}
    </div>
  )
}
