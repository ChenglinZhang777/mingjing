import { streamChat } from './ai.service.js'
import { REHEARSAL_BEHAVIORAL_PROMPT } from '../prompts/rehearsal-behavioral.js'
import { REHEARSAL_TECHNICAL_PROMPT } from '../prompts/rehearsal-technical.js'
import { REHEARSAL_STRESS_PROMPT } from '../prompts/rehearsal-stress.js'

type InterviewerStyle = 'behavioral' | 'technical' | 'stress'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const PROMPT_MAP: Record<InterviewerStyle, string> = {
  behavioral: REHEARSAL_BEHAVIORAL_PROMPT,
  technical: REHEARSAL_TECHNICAL_PROMPT,
  stress: REHEARSAL_STRESS_PROMPT,
}

export function getSystemPrompt(style: InterviewerStyle): string {
  return PROMPT_MAP[style]
}

export async function getFirstQuestion(
  style: InterviewerStyle,
  scenario: string,
): Promise<string> {
  const systemPrompt = getSystemPrompt(style)
  let question = ''

  await streamChat({
    systemPrompt,
    userMessage: `面试场景：${scenario}\n\n请开始面试，提出你的第一个问题。`,
    onChunk: () => {},
    onDone: (response) => {
      question = response
    },
  })

  return question
}

interface RespondResult {
  content: string
  isInterviewEnd: boolean
}

export async function respond(
  style: InterviewerStyle,
  scenario: string,
  messages: Message[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<RespondResult> {
  const systemPrompt = getSystemPrompt(style)
  let fullResponse = ''

  const scenarioPrefix = { role: 'user' as const, content: `面试场景：${scenario}` }
  const scenarioAck = { role: 'assistant' as const, content: '好的，我已了解面试场景。请开始。' }

  const apiMessages = [
    scenarioPrefix,
    scenarioAck,
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ]

  await streamChat({
    systemPrompt,
    userMessage: apiMessages[apiMessages.length - 1]?.content ?? '',
    messages: apiMessages.slice(0, -1),
    onChunk,
    onDone: (response) => {
      fullResponse = response
    },
    signal,
  })

  const isInterviewEnd = fullResponse.includes('[INTERVIEW_END]')
  const content = isInterviewEnd
    ? fullResponse.replace('[INTERVIEW_END]', '').trim()
    : fullResponse

  return { content, isInterviewEnd }
}
