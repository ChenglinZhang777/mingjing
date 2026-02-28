import { streamChat } from './ai.service.js'
import { LAYERS_SYSTEM_PROMPT } from '../prompts/layers-system.js'

interface Layer {
  layerIndex: number
  title: string
  content: string
  keyInsights: string[]
  editableFields: string[]
}

interface Suggestion {
  action: string
  rationale: string
  priority: string
}

interface LayersAnalysisResult {
  layers: Layer[]
  suggestions: Suggestion[]
}

export async function analyze(
  inputText: string,
  onLayer: (layer: Layer) => void,
  onDone: () => void,
  signal?: AbortSignal,
): Promise<LayersAnalysisResult> {
  let fullResponse = ''

  await streamChat({
    systemPrompt: LAYERS_SYSTEM_PROMPT,
    userMessage: `Please analyze the following career confusion:\n\n${inputText}`,
    onChunk: () => {
      // Chunks streamed but we parse at the end for structured data
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

  let result: LayersAnalysisResult
  try {
    result = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('AI 返回了格式错误的数据，请重试')
  }

  // Emit each layer for SSE streaming
  for (const layer of result.layers) {
    onLayer(layer)
  }

  onDone()

  return result
}
