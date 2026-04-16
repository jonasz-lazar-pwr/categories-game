// === src/Round/Domain/RoundFacade.ts ===

import type { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'

export interface IClosedAnswerDto {
  playerId: string
  categoryId: string
  value: string
}

export interface IRoundFacade {
  getClosedAnswers(roundId: RoundIdVo): Promise<IClosedAnswerDto[]>
}
