import { streamChat } from './ai.service.js'
import { FEYNMAN_SYSTEM_PROMPT } from '../prompts/feynman-system.js'

interface FeynmanScores {
  udi: number
  ddi: number
  cci: number
  total: number
}

interface FeynmanAnalysisResult {
  scores: FeynmanScores
  analysis: Record<string, { score: number; feedback: string; issues: string[] }>
  improvements: Array<{ issue: string; suggestion: string; example: string }>
  summary: string
}

export async function analyze(
  starStory: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<FeynmanAnalysisResult> {
  let fullResponse = ''

  await streamChat({
    systemPrompt: FEYNMAN_SYSTEM_PROMPT,
    userMessage: `Please analyze the following STAR story:\n\n${starStory}`,
    onChunk: (chunk) => {
      onChunk(chunk)
    },
    onDone: (response) => {
      fullResponse = response
    },
    signal,
  })

  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('AI 分析结果解析失败，请重试')
  }

  try {
    const result: FeynmanAnalysisResult = JSON.parse(jsonMatch[0])
    return result
  } catch {
    throw new Error('AI 返回了格式错误的数据，请重试')
  }
}
