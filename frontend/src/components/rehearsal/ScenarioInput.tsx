import { cn } from '@/lib/utils'

interface ScenarioInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const PLACEHOLDER =
  '我要面试一家互联网公司的产品经理岗位，有 3 年工作经验，希望练习如何介绍自己的项目经历'

export function ScenarioInput({ value, onChange, disabled }: ScenarioInputProps) {
  const charCount = value.length
  const isOverLimit = charCount > 300
  const isTooShort = charCount > 0 && charCount < 50

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">面试场景描述</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={PLACEHOLDER}
        disabled={disabled}
        rows={4}
        className={cn(
          'w-full resize-none rounded-lg border bg-background px-4 py-3 text-sm',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isOverLimit && 'border-red-500 focus:ring-red-500',
        )}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isTooShort && '建议至少 50 字，描述越详细，面试越贴近真实场景'}
          {isOverLimit && <span className="text-red-500">超出建议字数，请精简描述</span>}
        </span>
        <span className={cn(isOverLimit && 'text-red-500')}>{charCount}/300</span>
      </div>
    </div>
  )
}
