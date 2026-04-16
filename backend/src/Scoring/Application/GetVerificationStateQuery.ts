// === src/Scoring/Application/GetVerificationStateQuery.ts ===

import type { VerificationStateView } from '#/Scoring/Application/View/VerificationStateView.js'

export interface IGetVerificationStateQuery {
  execute(verificationId: string): Promise<VerificationStateView | null>
}
