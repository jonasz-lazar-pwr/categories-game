// === src/Game/Application/View/ScoringConfigView.ts ===

export class ScoringConfigView {
  public constructor(
    public readonly uniqueOnlyPoints: number,
    public readonly uniquePoints: number,
    public readonly duplicatePoints: number,
    public readonly closingTimeSeconds: number,
    public readonly verificationTimeoutSeconds: number,
    public readonly waitingForHostTimeoutSeconds: number,
  ) {}
}
