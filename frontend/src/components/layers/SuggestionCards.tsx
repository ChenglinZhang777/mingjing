import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Suggestion } from '@/types/layers'
import { ChevronDown } from 'lucide-react'

const PRIORITY_STYLES: Record<Suggestion['priority'], { label: string; className: string }> = {
  high: { label: '高', className: 'bg-red-100 text-red-800' },
  medium: { label: '中', className: 'bg-amber-100 text-amber-800' },
  low: { label: '低', className: 'bg-green-100 text-green-800' },
}

const PRIORITY_ORDER: Record<Suggestion['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

interface SuggestionCardProps {
  suggestion: Suggestion
}

function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const priority = PRIORITY_STYLES[suggestion.priority]

  return (
    <div className="rounded-lg border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={cn(
                'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                priority.className,
              )}
            >
              {priority.label}优先
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed">{suggestion.action}</p>
        </div>

        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent"
          title={expanded ? '收起理由' : '展开理由'}
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </button>
      </div>

      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          expanded ? 'mt-3 max-h-40 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {suggestion.rationale}
        </p>
      </div>
    </div>
  )
}

interface SuggestionCardsProps {
  suggestions: Suggestion[]
}

export function SuggestionCards({ suggestions }: SuggestionCardsProps) {
  const sorted = [...suggestions].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  )

  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold">可行动建议</h3>
      {sorted.map((suggestion, index) => (
        <SuggestionCard key={index} suggestion={suggestion} />
      ))}
    </div>
  )
}
