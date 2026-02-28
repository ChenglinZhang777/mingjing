export type InterviewerStyle = 'behavioral' | 'technical' | 'stress'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface FeedbackDimension {
  name: string
  score: number
  feedback: string
  suggestion: string
}

export interface RehearsalFeedback {
  scores: {
    expressionClarity: number
    contentDepth: number
    adaptability: number
    overallImpression: number
    total: number
  }
  dimensions: FeedbackDimension[]
  highlights: string[]
  improvements: string[]
  summary: string
}

export interface RehearsalSession {
  id: string
  scenario: string
  interviewerStyle: InterviewerStyle
  messages: ChatMessage[]
  feedback?: RehearsalFeedback
  status: 'active' | 'completed'
  createdAt: string
}

export interface RehearsalHistoryItem {
  id: string
  scenario: string
  interviewerStyle: InterviewerStyle
  status: 'active' | 'completed'
  feedback?: { scores: { total: number } }
  createdAt: string
}
