// === src/Scoring/Application/IAiService.ts ===

export interface IAiEvaluationResult {
  score: number
  reasoning: string
}

export interface IAiService {
  evaluate(
    value: string,
    categoryName: string,
    categoryDescription: string,
    letter: string,
  ): Promise<IAiEvaluationResult>
}
