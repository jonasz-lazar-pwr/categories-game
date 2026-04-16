// === src/Scoring/Application/View/AnswerVerificationItemView.ts ===

export class AnswerVerificationItemView {
  public constructor(
    public readonly playerId: string,
    public readonly categoryId: string,
    public readonly value: string,
    public readonly aiScore: number | null,
    public readonly aiReasoning: string | null,
    public readonly isAccepted: boolean | null,
    public readonly isResolved: boolean,
  ) {}
}
