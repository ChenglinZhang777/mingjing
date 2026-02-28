import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Clock, History } from 'lucide-react'
import { StarInput } from '@/components/feynman/StarInput'
import { AnalysisResult } from '@/components/feynman/AnalysisResult'
import { ImprovementCards } from '@/components/feynman/ImprovementCards'
import { AnalysisLoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { apiClient } from '@/lib/api-client'
import { streamFetch } from '@/lib/sse-client'
import { cn } from '@/lib/utils'
import type { FeynmanAnalysisResult, FeynmanHistoryItem } from '@/types/feynman'
import type { PaginatedResponse } from '@/types/api'

type PageState = 'idle' | 'analyzing' | 'done'

export function FeynmanPage() {
  const [state, setState] = useState<PageState>('idle')
  const [analysisResult, setAnalysisResult] = useState<FeynmanAnalysisResult | null>(null)
  const [streamText, setStreamText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [selectedHistory, setSelectedHistory] = useState<FeynmanAnalysisResult | null>(null)

  const historyQuery = useQuery({
    queryKey: ['feynman-history'],
    queryFn: () =>
      apiClient<PaginatedResponse<FeynmanHistoryItem>['data']>('/feynman/history?page=1&limit=10'),
    enabled: showHistory,
  })

  const handleSubmit = useCallback(async (story: string) => {
    setState('analyzing')
    setAnalysisResult(null)
    setSelectedHistory(null)
    setStreamText('')
    setError(null)

    try {
      // Step 1: Create session
      const session = await apiClient<{ sessionId: string }>('/feynman/session', {
        method: 'POST',
        body: JSON.stringify({ title: story.slice(0, 50) }),
      })

      // Step 2: Stream analysis
      const token = localStorage.getItem('token')
      if (!token) throw new Error('未登录')

      await streamFetch(
        '/api/v1/feynman/analyze',
        { sessionId: session.sessionId, starStory: story },
        token,
        (event, data) => {
          if (event === 'chunk') {
            const chunk = data as { type: string; content?: string }
            if (chunk.content) {
              setStreamText((prev) => prev + chunk.content)
            }
          } else if (event === 'done') {
            const result = data as { type: string } & FeynmanAnalysisResult
            setAnalysisResult({
              scores: result.scores,
              analysis: result.analysis,
              improvements: result.improvements,
              summary: result.summary,
            })
            setState('done')
          }
        },
      )

      // If we reach here without a 'done' event, something went wrong
      setState((prev) => (prev === 'analyzing' ? 'done' : prev))
    } catch (err) {
      const message = err instanceof Error ? err.message : '分析失败，请重试'
      setError(message)
      setState('idle')
    }
  }, [])

  const handleViewHistory = useCallback(async (id: string) => {
    try {
      const session = await apiClient<{
        analysisResult: FeynmanAnalysisResult
      }>(`/feynman/session/${id}`)
      if (session.analysisResult) {
        setSelectedHistory(session.analysisResult)
        setAnalysisResult(null)
        setState('done')
      }
    } catch {
      // Ignore — just don't navigate
    }
  }, [])

  const displayResult = selectedHistory ?? analysisResult

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">费曼面试检验</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          用费曼法检测你的 STAR 故事，发现表达盲区
        </p>
      </div>

      {/* Main content: two-column on desktop, stacked on mobile */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Input */}
        <div>
          <StarInput
            onSubmit={handleSubmit}
            isLoading={state === 'analyzing'}
            disabled={state === 'analyzing'}
          />
        </div>

        {/* Right: Results */}
        <div>
          {state === 'idle' && !displayResult && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
              <div className="rounded-full bg-muted p-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                输入你的 STAR 故事开始分析
              </p>
            </div>
          )}

          {state === 'analyzing' && (
            <div className="space-y-4">
              <AnalysisLoadingSkeleton />
              {streamText && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground">AI 分析进度</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                    {streamText}
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {state === 'done' && displayResult && (
            <div className="space-y-6">
              <AnalysisResult result={displayResult} />
              <ImprovementCards improvements={displayResult.improvements} />
            </div>
          )}
        </div>
      </div>

      {/* History section */}
      <div className="border-t pt-6">
        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <History className="h-4 w-4" />
          我的分析历史
          <ChevronDown
            className={cn('h-4 w-4 transition-transform', showHistory && 'rotate-180')}
          />
        </button>

        {showHistory && (
          <div className="mt-4">
            {historyQuery.isLoading && (
              <p className="text-sm text-muted-foreground">加载中...</p>
            )}

            {historyQuery.isError && (
              <p className="text-sm text-red-500">加载失败，请重试</p>
            )}

            {historyQuery.data && (
              <HistoryList
                items={historyQuery.data as unknown as FeynmanHistoryItem[]}
                onSelect={handleViewHistory}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function HistoryList({
  items,
  onSelect,
}: {
  items: FeynmanHistoryItem[]
  onSelect: (id: string) => void
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无分析记录</p>
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-accent transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {item.title ?? '未命名分析'}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(item.createdAt).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          {item.scores && (
            <span className={cn('text-lg font-bold', getScoreColor(item.scores.total))}>
              {item.scores.total}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}
