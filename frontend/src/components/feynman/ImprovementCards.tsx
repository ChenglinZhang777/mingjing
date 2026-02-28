import { useState } from 'react'
import { ChevronDown, AlertCircle, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeynmanImprovement } from '@/types/feynman'

interface ImprovementCardsProps {
  improvements: FeynmanImprovement[]
}

export function ImprovementCards({ improvements }: ImprovementCardsProps) {
  if (improvements.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">改进建议</h3>
      {improvements.map((item, index) => (
        <ImprovementCard key={index} improvement={item} index={index} />
      ))}
    </div>
  )
}

function ImprovementCard({
  improvement,
  index,
}: {
  improvement: FeynmanImprovement
  index: number
}) {
  const [showExample, setShowExample] = useState(false)

  return (
    <div className="rounded-lg border p-4">
      <div className="space-y-2">
        {/* Issue */}
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">
            <span className="font-medium">问题 {index + 1}：</span>
            {improvement.issue}
          </p>
        </div>

        {/* Suggestion */}
        <div className="flex items-start gap-2">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <p className="text-sm text-blue-700">{improvement.suggestion}</p>
        </div>

        {/* Example toggle */}
        {improvement.example && (
          <div>
            <button
              type="button"
              onClick={() => setShowExample((prev) => !prev)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              查看改写示例
              <ChevronDown
                className={cn('h-3 w-3 transition-transform', showExample && 'rotate-180')}
              />
            </button>

            {showExample && (
              <div className="mt-2 rounded-md bg-emerald-50 p-3">
                <p className="text-xs font-medium text-emerald-800">改写示例</p>
                <p className="mt-1 text-sm leading-relaxed text-emerald-700">
                  {improvement.example}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
