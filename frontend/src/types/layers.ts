export interface Layer {
  layerIndex: number // 0-3
  title: string // 事件层/情绪层/需求层/信念层
  content: string
  keyInsights: string[]
  editableFields: string[]
}

export interface Suggestion {
  action: string
  rationale: string
  priority: 'high' | 'medium' | 'low'
}

export interface LayerAnalysis {
  id: string
  title?: string
  inputText: string
  layers?: Layer[]
  suggestions?: Suggestion[]
  createdAt: string
}

export interface LayerSession {
  sessionId: string
  createdAt: string
}

export interface LayerHistoryItem {
  id: string
  title?: string
  createdAt: string
}
