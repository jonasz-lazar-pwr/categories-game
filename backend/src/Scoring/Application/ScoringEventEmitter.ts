// === src/Scoring/Application/ScoringEventEmitter.ts ===

export interface IFirstVerificationItem {
  playerId: string
  categoryId: string
  value: string
  aiScore: number
  aiReasoning: string | null
}

export interface IScoringEventEmitter {
  emitAiProcessingStarted(gameId: string, verificationId: string, answerCount: number): void
  emitAiProcessingDone(
    gameId: string,
    verificationId: string,
    firstItem: IFirstVerificationItem | null,
  ): void
}
