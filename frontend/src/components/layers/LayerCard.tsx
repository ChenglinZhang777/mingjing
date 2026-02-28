import { cn } from '@/lib/utils'
import type { Layer } from '@/types/layers'

const LAYER_STYLES: Record<number, { color: string; bg: string; border: string; badge: string; icon: string }> = {
  0: {
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-800',
    icon: '🔵',
  },
  1: {
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-800',
    icon: '🟠',
  },
  2: {
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-100 text-green-800',
    icon: '🟢',
  },
  3: {
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-800',
    icon: '🟣',
  },
}

interface LayerCardProps {
  layer: Layer
  visible: boolean
}

export function LayerCard({ layer, visible }: LayerCardProps) {
  const style = LAYER_STYLES[layer.layerIndex] ?? LAYER_STYLES[0]

  return (
    <div
      className={cn(
        'rounded-xl border p-5 transition-all duration-500 ease-out',
        style.bg,
        style.border,
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0',
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">{style.icon}</span>
        <h3 className={cn('text-base font-semibold', style.color)}>
          第 {layer.layerIndex + 1} 层 — {layer.title}
        </h3>
      </div>

      {/* Content */}
      <p className="mb-4 text-sm leading-relaxed text-foreground/80">
        {layer.content}
      </p>

      {/* Key Insights */}
      {layer.keyInsights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {layer.keyInsights.map((insight) => (
            <span
              key={insight}
              className={cn(
                'inline-block rounded-full px-3 py-1 text-xs font-medium',
                style.badge,
              )}
            >
              {insight}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
