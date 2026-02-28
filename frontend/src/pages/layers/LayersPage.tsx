import { useState, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Layers, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { streamFetch } from '@/lib/sse-client'
import { ConfusionInput } from '@/components/layers/ConfusionInput'
import { LayerStack } from '@/components/layers/LayerStack'
import { SuggestionCards } from '@/components/layers/SuggestionCards'
import type { Layer, Suggestion, LayerSession, LayerHistoryItem } from '@/types/layers'
import type { PaginatedResponse } from '@/types/api'

type PageState = 'input' | 'analyzing' | 'done'

const LAYER_REVEAL_DELAY_MS = 300

const LAYER_DESCRIPTIONS = [
  { icon: '🔵', title: '事件层', desc: '发生了什么客观事实' },
  { icon: '🟠', title: '情绪层', desc: '产生了什么感受' },
  { icon: '🟢', title: '需求层', desc: '背后真正想要什么' },
  { icon: '🟣', title: '信念层', desc: '驱动你的深层假设是什么' },
] as const

export function LayersPage() {
  const [state, setState] = useState<PageState>('input')
  const [layers, setLayers] = useState<Layer[]>([])
  const [revealedCount, setRevealedCount] = useState(0)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guideExpanded, setGuideExpanded] = useState(false)
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // History query
  const historyQuery = useQuery({
    queryKey: ['layers', 'history'],
    queryFn: async () => {
      const response = await fetch('/api/v1/layers/history?page=1&limit=10', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      const result = (await response.json()) as PaginatedResponse<LayerHistoryItem>
      if (!result.success) throw new Error('获取历史记录失败')
      return result.data
    },
  })

  const handleSubmit = useCallback(async (inputText: string) => {
    setState('analyzing')
    setLayers([])
    setRevealedCount(0)
    setSuggestions([])
    setShowSuggestions(false)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('请先登录')

      // Step 1: create session
      const session = await apiClient<LayerSession>('/layers/session', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      // Step 2: stream analyze
      await streamFetch(
        '/api/v1/layers/analyze',
        { sessionId: session.sessionId, inputText },
        token,
        (event, data) => {
          if (event === 'layer') {
            const layer = data as Layer
            setLayers((prev) => [...prev, layer])
            // Delay reveal for animation effect
            revealTimerRef.current = setTimeout(() => {
              setRevealedCount((prev) => prev + 1)
            }, LAYER_REVEAL_DELAY_MS)
          } else if (event === 'suggestions') {
            const parsed = data as { suggestions: Suggestion[] }
            setSuggestions(parsed.suggestions)
          } else if (event === 'done') {
            // Show suggestions after all layers are revealed
            setTimeout(() => {
              setShowSuggestions(true)
              setState('done')
            }, LAYER_REVEAL_DELAY_MS)
          }
        },
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析过程出现错误，请重试')
      setState('input')
    }
  }, [])

  const handleReset = useCallback(() => {
    if (revealTimerRef.current !== null) clearTimeout(revealTimerRef.current)
    setState('input')
    setLayers([])
    setRevealedCount(0)
    setSuggestions([])
    setShowSuggestions(false)
    setError(null)
  }, [])

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3">
          <Layers className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">四层职业剖析</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          将模糊的职业困惑拆解为可决策的四层结构
        </p>
      </div>

      {/* Layer Guide (collapsible) */}
      <div className="rounded-lg border bg-card">
        <button
          onClick={() => setGuideExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-sm font-medium">了解四层分析框架</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              guideExpanded && 'rotate-180',
            )}
          />
        </button>

        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            guideExpanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
            {LAYER_DESCRIPTIONS.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-2 rounded-md bg-muted/50 p-3"
              >
                <span className="text-base">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Input State */}
      {state === 'input' && <ConfusionInput onSubmit={handleSubmit} />}

      {/* Analyzing State */}
      {state === 'analyzing' && (
        <div className="space-y-6">
          {layers.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">正在分析你的职业困惑...</span>
            </div>
          )}

          {layers.length > 0 && (
            <LayerStack layers={layers} revealedCount={revealedCount} />
          )}
        </div>
      )}

      {/* Done State */}
      {state === 'done' && (
        <div className="space-y-6">
          <LayerStack layers={layers} revealedCount={revealedCount} />

          {showSuggestions && suggestions.length > 0 && (
            <div className="transition-all duration-500">
              <SuggestionCards suggestions={suggestions} />
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleReset}
              className={cn(
                'rounded-lg border px-5 py-2 text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
              )}
            >
              重新剖析
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">历史记录</h3>

        {historyQuery.isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        )}

        {historyQuery.data && historyQuery.data.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            暂无历史记录
          </p>
        )}

        {historyQuery.data && historyQuery.data.length > 0 && (
          <div className="divide-y rounded-lg border">
            {historyQuery.data.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="truncate text-sm">
                  {item.title ?? '未命名剖析'}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
