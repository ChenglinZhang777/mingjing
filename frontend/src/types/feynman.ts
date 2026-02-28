export interface FeynmanScores {
  udi: number
  ddi: number
  cci: number
  total: number
}

export interface FeynmanDimensionAnalysis {
  score: number
  feedback: string
  issues: string[]
}

export interface FeynmanImprovement {
  issue: string
  suggestion: string
  example: string
}

export interface FeynmanAnalysisResult {
  scores: FeynmanScores
  analysis: {
    udi: FeynmanDimensionAnalysis
    ddi: FeynmanDimensionAnalysis
    cci: FeynmanDimensionAnalysis
  }
  improvements: FeynmanImprovement[]
  summary: string
}

export interface FeynmanSession {
  id: string
  title?: string
  starStory: string
  analysisResult?: FeynmanAnalysisResult
  scores?: FeynmanScores
  createdAt: string
}

export interface FeynmanHistoryItem {
  id: string
  title?: string
  scores?: FeynmanScores
  createdAt: string
}
