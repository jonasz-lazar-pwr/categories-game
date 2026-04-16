// === src/Round/Domain/ScoringFacade.ts ===

// This interface is defined in Round/Domain because Round/Application depends on it.
// When the Scoring domain is implemented, it will provide a concrete implementation
// that is injected here via bootstrapScoring and passed to bootstrapRound.

export interface IClosedAnswerForScoringDto {
  playerId: string
  categoryId: string
  value: string
}

export interface IScoringFacade {
  startAiProcessing(
    roundId: string,
    gameId: string,
    letter: string,
    closedAnswers: IClosedAnswerForScoringDto[],
  ): Promise<void>
}
