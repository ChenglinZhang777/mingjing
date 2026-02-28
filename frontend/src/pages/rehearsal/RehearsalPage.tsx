import { useState, useCallback, useEffect, useRef } from 'react'
import { MessageSquare, History, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api-client'
import { streamFetch } from '@/lib/sse-client'
import { ScenarioInput } from '@/components/rehearsal/ScenarioInput'
import { StyleSelector } from '@/components/rehearsal/StyleSelector'
import { ChatInterface } from '@/components/rehearsal/ChatInterface'
import { FeedbackReport } from '@/components/rehearsal/FeedbackReport'
import type {
  InterviewerStyle,
  ChatMessage,
  RehearsalFeedback,
  RehearsalHistoryItem,
} from '@/types/rehearsal'
import type { PaginatedResponse } from '@/types/api'

type Phase = 'setup' | 'interviewing' | 'feedback'

interface SSEChunkData {
  type: string
  content?: string
}

interface SSEDoneData {
  type: string
  content: string
  isInterviewEnd: boolean
  roundNumber: number
  totalRounds: number
}

interface SessionCreateResponse {
  sessionId: string
  firstQuestion: string
}

const MAX_FEEDBACK_POLL_ATTEMPTS = 15
const FEEDBACK_POLL_INTERVAL_MS = 2000

export function RehearsalPage() {
  // Phase state
  const [phase, setPhase] = useState<Phase>('setup')

  // Setup state
  const [scenario, setScenario] = useState('')
  const [style, setStyle] = useState<InterviewerStyle>('behavioral')
  const [isCreating, setIsCreating] = useState(false)

  // Interview state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [roundNumber, setRoundNumber] = useState(0)
  const [maxRounds, setMaxRounds] = useState(8)
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | undefined>(undefined)

  // Feedback state
  const [feedback, setFeedback] = useState<RehearsalFeedback | null>(null)
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false)

  // History state
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<RehearsalHistoryItem[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  // Ref to track abort — uses AbortController for proper SSE cancellation
  const abortControllerRef = useRef<AbortController | null>(null)
  const abortRef = useRef(false)

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // ===== PHASE 1: Setup =====

  const handleStartInterview = useCallback(async () => {
    if (!scenario.trim() || isCreating) return

    setIsCreating(true)
    try {
      const result = await apiClient<SessionCreateResponse>('/rehearsal/session', {
        method: 'POST',
        body: JSON.stringify({ scenario, interviewerStyle: style }),
      })

      setSessionId(result.sessionId)

      const firstMessage: ChatMessage = {
        role: 'assistant',
        content: result.firstQuestion,
        timestamp: new Date().toISOString(),
      }
      setMessages([firstMessage])
      setRoundNumber(1)
      setPhase('interviewing')
    } catch (err) {
      // TODO: show error toast
      console.error('创建排练会话失败:', err)
    } finally {
      setIsCreating(false)
    }
  }, [scenario, style, isCreating])

  // ===== PHASE 2: Interviewing =====

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!sessionId || isStreaming) return

      abortRef.current = false
      abortControllerRef.current = new AbortController()

      // Add user message
      const userMessage: ChatMessage = {
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      }

      // Create placeholder for AI response
      const aiPlaceholder: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage, aiPlaceholder])
      setIsStreaming(true)

      // Track the streaming message index (the AI placeholder)
      const aiMessageIndex = messages.length + 1 // +1 because user message is added first
      setStreamingMessageIndex(aiMessageIndex)

      const token = localStorage.getItem('token')
      if (!token) {
        setIsStreaming(false)
        setStreamingMessageIndex(undefined)
        return
      }

      try {
        let fullContent = ''
        let interviewEnded = false

        await streamFetch(
          '/api/v1/rehearsal/message',
          { sessionId, content },
          token,
          (event: string, data: unknown) => {
            if (abortRef.current) return

            if (event === 'chunk') {
              const chunkData = data as SSEChunkData
              if (chunkData.type === 'content' && chunkData.content) {
                fullContent += chunkData.content
                setMessages((prev) => {
                  const updated = [...prev]
                  const lastIdx = updated.length - 1
                  updated[lastIdx] = {
                    ...updated[lastIdx],
                    content: fullContent,
                  }
                  return updated
                })
              }
            } else if (event === 'done') {
              const doneData = data as SSEDoneData
              fullContent = doneData.content
              interviewEnded = doneData.isInterviewEnd
              setRoundNumber(doneData.roundNumber)
              setMaxRounds(doneData.totalRounds)

              // Finalize the AI message
              setMessages((prev) => {
                const updated = [...prev]
                const lastIdx = updated.length - 1
                updated[lastIdx] = {
                  ...updated[lastIdx],
                  content: fullContent,
                  timestamp: new Date().toISOString(),
                }
                return updated
              })
            }
          },
          abortControllerRef.current?.signal,
        )

        if (interviewEnded) {
          await handleEndInterview()
        }
      } catch (err) {
        console.error('发送消息失败:', err)
        // Remove the empty AI placeholder on error
        setMessages((prev) => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (updated[lastIdx].role === 'assistant' && updated[lastIdx].content === '') {
            return updated.slice(0, -1)
          }
          return updated
        })
      } finally {
        setIsStreaming(false)
        setStreamingMessageIndex(undefined)
      }
    },
    [sessionId, isStreaming, messages.length],
  )

  const handleEndInterview = useCallback(async () => {
    if (!sessionId) return

    setPhase('feedback')
    setIsFeedbackLoading(true)

    try {
      // Trigger feedback generation
      await apiClient<{ feedbackId: string }>(`/rehearsal/end/${sessionId}`, {
        method: 'POST',
      })

      // Poll for feedback
      let attempts = 0
      const poll = async () => {
        if (attempts >= MAX_FEEDBACK_POLL_ATTEMPTS) {
          throw new Error('反馈生成超时，请稍后刷新重试')
        }

        try {
          const result = await apiClient<RehearsalFeedback>(`/rehearsal/feedback/${sessionId}`)
          setFeedback(result)
          setIsFeedbackLoading(false)
        } catch {
          attempts++
          await new Promise((resolve) => setTimeout(resolve, FEEDBACK_POLL_INTERVAL_MS))
          await poll()
        }
      }

      await poll()
    } catch (err) {
      console.error('获取反馈失败:', err)
      setIsFeedbackLoading(false)
    }
  }, [sessionId])

  // ===== PHASE 3: Feedback =====

  const handleRestart = useCallback(() => {
    setPhase('setup')
    setSessionId(null)
    setMessages([])
    setFeedback(null)
    setRoundNumber(0)
    setScenario('')
    setStyle('behavioral')
    setStreamingMessageIndex(undefined)
    abortRef.current = true
    abortControllerRef.current?.abort()
  }, [])

  // ===== History =====

  const loadHistory = useCallback(async () => {
    if (isHistoryLoading) return

    setIsHistoryLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/v1/rehearsal/history?page=1&limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = (await response.json()) as PaginatedResponse<RehearsalHistoryItem>

      if (result.success) {
        setHistory(result.data)
      }
    } catch (err) {
      console.error('加载历史记录失败:', err)
    } finally {
      setIsHistoryLoading(false)
    }
  }, [isHistoryLoading])

  useEffect(() => {
    if (historyOpen && history.length === 0) {
      loadHistory()
    }
  }, [historyOpen, history.length, loadHistory])

  const canStart = scenario.trim().length >= 20

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header — only in setup & feedback */}
      {phase !== 'interviewing' && (
        <div className="text-center">
          <div className="inline-flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">安全排练室</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            在零后果的环境中练习真实面试，获得即时反馈
          </p>
        </div>
      )}

      {/* Phase: Setup */}
      {phase === 'setup' && (
        <div className="space-y-6 rounded-lg border p-6">
          <ScenarioInput value={scenario} onChange={setScenario} disabled={isCreating} />
          <StyleSelector selected={style} onChange={setStyle} disabled={isCreating} />
          <button
            type="button"
            onClick={handleStartInterview}
            disabled={!canStart || isCreating}
            className={cn(
              'w-full rounded-lg py-3 text-sm font-medium transition-colors',
              canStart && !isCreating
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'cursor-not-allowed bg-muted text-muted-foreground',
            )}
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                正在创建面试...
              </span>
            ) : (
              '开始面试'
            )}
          </button>
        </div>
      )}

      {/* Phase: Interviewing */}
      {phase === 'interviewing' && (
        <div className="h-[calc(100vh-12rem)] rounded-lg border">
          <ChatInterface
            messages={messages}
            isLoading={isStreaming}
            onSend={handleSendMessage}
            onEnd={handleEndInterview}
            roundNumber={roundNumber}
            maxRounds={maxRounds}
            streamingMessageIndex={streamingMessageIndex}
          />
        </div>
      )}

      {/* Phase: Feedback */}
      {phase === 'feedback' && (
        <div className="rounded-lg border p-6">
          {isFeedbackLoading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">正在生成面试反馈报告...</p>
            </div>
          ) : feedback ? (
            <FeedbackReport feedback={feedback} onRestart={handleRestart} />
          ) : (
            <div className="flex flex-col items-center gap-4 py-12">
              <p className="text-muted-foreground">反馈生成失败</p>
              <button
                type="button"
                onClick={handleRestart}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                返回重试
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Section — collapsed by default */}
      {phase === 'setup' && (
        <div className="rounded-lg border">
          <button
            type="button"
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50"
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              排练历史
            </span>
            {historyOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {historyOpen && (
            <div className="border-t px-4 py-3">
              {isHistoryLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  暂无排练记录
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <HistoryItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ===== Sub-components =====

const STYLE_LABEL: Record<InterviewerStyle, string> = {
  behavioral: '行为面试',
  technical: '技术面试',
  stress: '压力面试',
}

function HistoryItem({ item }: { item: RehearsalHistoryItem }) {
  const date = new Date(item.createdAt).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm line-clamp-1">
          {item.scenario.slice(0, 40)}
          {item.scenario.length > 40 && '...'}
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{STYLE_LABEL[item.interviewerStyle]}</span>
          <span>{date}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {item.feedback?.scores.total != null && (
          <span className={cn('text-sm font-medium', getScoreColor(item.feedback.scores.total))}>
            {item.feedback.scores.total}分
          </span>
        )}
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs',
            item.status === 'completed'
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700',
          )}
        >
          {item.status === 'completed' ? '已完成' : '进行中'}
        </span>
      </div>
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-500'
  return 'text-red-500'
}
