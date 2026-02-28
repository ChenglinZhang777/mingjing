import { streamChat } from './ai.service.js'
import { REHEARSAL_FEEDBACK_PROMPT } from '../prompts/rehearsal-feedback.js'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface FeedbackScores {
  expressionClarity: number
  contentDepth: number
  adaptability: number
  overallImpression: number
  total: number
}

interface FeedbackDimension {
  name: string
  score: number
  feedback: string
  suggestion: string
}

interface FeedbackResult {
  scores: FeedbackScores
  dimensions: FeedbackDimension[]
  highlights: string[]
  improvements: string[]
  summary: string
}

export async function generate(messages: Message[], style: string): Promise<FeedbackResult> {
  const conversationText = messages
    .map((m) => `${m.role === 'assistant' ? '面试官' : '候选人'}: ${m.content}`)
    .join('\n\n')

  let fullResponse = ''

  await streamChat({
    systemPrompt: REHEARSAL_FEEDBACK_PROMPT,
    userMessage: `Interview style: ${style}\n\nFull interview transcript:\n\n${conversationText}`,
    onChunk: () => {},
    onDone: (response) => {
      fullResponse = response
    },
  })

  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('反馈生成失败，请重试')
  }

  try {
    const result: FeedbackResult = JSON.parse(jsonMatch[0])
    return result
  } catch {
    throw new Error('反馈数据格式错误，请重试')
  }
}
