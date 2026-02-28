import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  lines?: number
  height?: string
  className?: string
}

export function LoadingSkeleton({ lines = 4, height = 'h-4', className }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse rounded-md bg-muted',
            height,
            // Vary widths for visual interest
            i === lines - 1 ? 'w-3/5' : i % 2 === 0 ? 'w-full' : 'w-4/5',
          )}
        />
      ))}
    </div>
  )
}

export function AnalysisLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Radar chart skeleton */}
      <div className="flex justify-center">
        <div className="h-[280px] w-[280px] animate-pulse rounded-full bg-muted" />
      </div>

      {/* Dimension cards skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-12 animate-pulse rounded bg-muted" />
            </div>
            <LoadingSkeleton lines={3} height="h-3" />
          </div>
        ))}
      </div>

      {/* Improvement cards skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-lg border p-4">
            <LoadingSkeleton lines={2} height="h-3" />
          </div>
        ))}
      </div>
    </div>
  )
}
