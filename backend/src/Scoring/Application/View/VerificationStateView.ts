// === src/Scoring/Application/View/VerificationStateView.ts ===

import type { AnswerVerificationItemView } from '#/Scoring/Application/View/AnswerVerificationItemView.js'

export class VerificationStateView {
  public constructor(
    public readonly verificationId: string,
    public readonly status: string,
    public readonly cursorPlayerId: string | null,
    public readonly cursorCategoryId: string | null,
    public readonly items: AnswerVerificationItemView[],
  ) {}
}
