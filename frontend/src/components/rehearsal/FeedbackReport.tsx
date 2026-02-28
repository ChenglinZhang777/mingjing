import { CheckCircle, ArrowRight, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScoreRadar } from '@/components/shared/ScoreRadar'
import type { RehearsalFeedback } from '@/types/rehearsal'

interface FeedbackReportProps {
  feedback: RehearsalFeedback
  onRestart: () => void
}

const DIMENSION_LABELS: Record<string, string> = {
  'Expression Clarity': '表达清晰度',
  'Content Depth': '内容深度',
  Adaptability: '适应性',
  'Overall Impression': '总体印象',
}

export function FeedbackReport({ feedback, onRestart }: FeedbackReportProps) {
  const radarDimensions = feedback.dimensions.map((d) => ({
    label: DIMENSION_LABELS[d.name] ?? d.name,
    value: d.score,
  }))

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="text-center">
        <h3 className="text-xl font-semibold">面试反馈报告</h3>
        <p className="mt-2 text-lg text-muted-foreground">{feedback.summary}</p>
        <div className="mt-3">
          <span className={cn('text-3xl font-bold', getScoreColor(feedback.scores.total))}>
            {feedback.scores.total}
          </span>
          <span className="ml-1 text-sm text-muted-foreground">/ 100</span>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="flex justify-center">
        <ScoreRadar dimensions={radarDimensions} size={320} />
      </div>

      {/* Dimension Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {feedback.dimensions.map((dim) => (
          <div key={dim.name} className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{DIMENSION_LABELS[dim.name] ?? dim.name}</span>
              <span className={cn('text-lg font-bold', getScoreColor(dim.score))}>
                {dim.score}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{dim.feedback}</p>
            {dim.suggestion && (
              <p className="text-sm text-primary/80">
                <ArrowRight className="mr-1 inline-block h-3 w-3" />
                {dim.suggestion}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Highlights */}
      {feedback.highlights.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-emerald-700">亮点</h4>
          <ul className="space-y-1.5">
            {feedback.highlights.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {feedback.improvements.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-blue-700">改进建议</h4>
          <ul className="space-y-1.5">
            {feedback.improvements.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Restart Button */}
      <div className="flex justify-center pt-4">
        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RotateCcw className="h-4 w-4" />
          重新练习
        </button>
      </div>
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}
