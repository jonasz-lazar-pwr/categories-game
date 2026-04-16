// === src/Round/Domain/RoundRepository.ts ===

import type { RoundAggregate } from '#/Round/Domain/RoundAggregate.js'
import type { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import type { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'

export interface IRoundRepository {
  findById(id: RoundIdVo): Promise<RoundAggregate | null>
  findByGameId(gameId: GameIdVo): Promise<RoundAggregate[]>
  findClosingWithDeadlineAfter(now: Date): Promise<RoundAggregate[]>
  save(round: RoundAggregate): Promise<void>
}
