import { cn } from '@/lib/utils'
import type { InterviewerStyle } from '@/types/rehearsal'

interface StyleSelectorProps {
  selected: InterviewerStyle
  onChange: (style: InterviewerStyle) => void
  disabled?: boolean
}

interface StyleOption {
  key: InterviewerStyle
  icon: string
  name: string
  description: string
  detail: string
}

const STYLE_OPTIONS: StyleOption[] = [
  {
    key: 'behavioral',
    icon: '👥',
    name: '行为面试',
    description: '温和友好，专注软技能和团队协作',
    detail: '适合练习 STAR 故事、领导力、团队协作等场景',
  },
  {
    key: 'technical',
    icon: '💻',
    name: '技术面试',
    description: '严谨深入，专注技术决策和问题解决',
    detail: '适合练习技术方案讲解、架构决策、问题分析',
  },
  {
    key: 'stress',
    icon: '⚡',
    name: '压力面试',
    description: '快节奏挑战，测试应变能力和抗压性',
    detail: '适合练习高压场景下的快速思考和自信表达',
  },
]

export function StyleSelector({ selected, onChange, disabled }: StyleSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">面试官风格</label>
      <div className="grid gap-3 sm:grid-cols-3">
        {STYLE_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.key)}
            className={cn(
              'flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all',
              'hover:border-primary/50 hover:shadow-sm',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected === option.key &&
                'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20',
            )}
          >
            <span className="text-2xl">{option.icon}</span>
            <div>
              <div className="font-medium">{option.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{option.description}</div>
            </div>
            <div className="text-xs text-muted-foreground/70">{option.detail}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
