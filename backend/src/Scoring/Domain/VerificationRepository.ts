// === src/Scoring/Domain/VerificationRepository.ts ===

import type { VerificationAggregate } from '#/Scoring/Domain/VerificationAggregate.js'
import type { VerificationIdVo } from '#/Scoring/Domain/ValueObjects/VerificationIdVo.js'
import type { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'

export interface IVerificationRepository {
  findById(id: VerificationIdVo): Promise<VerificationAggregate | null>
  findByRoundId(roundId: RoundIdVo): Promise<VerificationAggregate | null>
  save(verification: VerificationAggregate): Promise<void>
  saveAiResult(itemId: string, aiScore: number, aiReasoning: string): Promise<void>
}
