import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarElement {
  letter: string
  label: string
  description: string
  example: string
  color: string
}

const starElements: StarElement[] = [
  {
    letter: 'S',
    label: '情境（Situation）',
    description: '描述事件发生的背景和环境。让面试官理解你当时所处的情境。',
    example: '在我担任产品经理期间，公司的核心产品用户留存率连续三个月下降了 15%，管理层要求在一个季度内扭转趋势。',
    color: 'border-l-blue-500',
  },
  {
    letter: 'T',
    label: '任务（Task）',
    description: '说明你在该情境中的具体职责和目标。面试官想了解你承担了什么。',
    example: '作为负责用户增长的产品经理，我需要找出留存下降的根本原因，并设计一套可量化的改进方案。',
    color: 'border-l-emerald-500',
  },
  {
    letter: 'A',
    label: '行动（Action）',
    description: '详细描述你采取的具体步骤和行动。重点突出你个人的贡献。',
    example: '我首先分析了用户行为数据，发现新用户第 3 天流失最严重。于是我主导设计了一套引导式新手教程，并协调研发团队在两周内上线了 A/B 测试。',
    color: 'border-l-amber-500',
  },
  {
    letter: 'R',
    label: '结果（Result）',
    description: '用具体数据说明你的行动带来了什么成果。量化是关键。',
    example: '上线一个月后，新用户 7 日留存率从 32% 提升至 48%，季度整体留存回升 12%，超出管理层目标 2 个百分点。',
    color: 'border-l-red-500',
  },
]

export function StarGuide() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const toggleExpand = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index))
  }

  return (
    <div className="space-y-2">
      {starElements.map((element, index) => (
        <div
          key={element.letter}
          className={cn('rounded-lg border border-l-4 bg-card', element.color)}
        >
          <button
            type="button"
            onClick={() => toggleExpand(index)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {element.letter}
              </span>
              <span className="text-sm font-medium">{element.label}</span>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                expandedIndex === index && 'rotate-180',
              )}
            />
          </button>

          {expandedIndex === index && (
            <div className="space-y-2 border-t px-4 py-3">
              <p className="text-sm text-muted-foreground">{element.description}</p>
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground">示例</p>
                <p className="mt-1 text-sm">{element.example}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
