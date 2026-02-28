import { ScoreRadar } from '@/components/shared/ScoreRadar'
import type { FeynmanAnalysisResult } from '@/types/feynman'
import { cn } from '@/lib/utils'

interface AnalysisResultProps {
  result: FeynmanAnalysisResult
}

interface DimensionConfig {
  key: 'udi' | 'ddi' | 'cci'
  label: string
  fullName: string
}

const dimensions: DimensionConfig[] = [
  { key: 'udi', label: 'UDI', fullName: '理解深度' },
  { key: 'ddi', label: 'DDI', fullName: '数据密度' },
  { key: 'cci', label: 'CCI', fullName: '因果清晰度' },
]

export function AnalysisResult({ result }: AnalysisResultProps) {
  const radarDimensions = dimensions.map((d) => ({
    label: d.label,
    value: result.analysis[d.key].score,
  }))

  return (
    <div className="space-y-6">
      {/* Total score + Radar */}
      <div className="flex flex-col items-center gap-2">
        <div className="text-center">
          <span className={cn('text-4xl font-bold', getScoreColor(result.scores.total))}>
            {result.scores.total}
          </span>
          <span className="ml-1 text-lg text-muted-foreground">/ 100</span>
        </div>
        <p className="text-sm text-muted-foreground">综合评分</p>
      </div>

      <ScoreRadar dimensions={radarDimensions} />

      {/* Dimension detail cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {dimensions.map((dim) => {
          const analysis = result.analysis[dim.key]
          return (
            <div key={dim.key} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{dim.label}</p>
                  <p className="text-sm font-medium">{dim.fullName}</p>
                </div>
                <span className={cn('text-2xl font-bold', getScoreColor(analysis.score))}>
                  {analysis.score}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {analysis.feedback}
              </p>

              {analysis.issues.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {analysis.issues.map((issue, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-red-600"
                    >
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">总结</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
      </div>
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}
