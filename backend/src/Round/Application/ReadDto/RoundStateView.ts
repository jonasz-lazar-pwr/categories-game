// === src/Round/Application/ReadDto/RoundStateView.ts ===

import type { CategoryInRoundView } from '#/Round/Application/View/CategoryInRoundView.js'

export class RoundStateView {
  public constructor(
    public readonly roundId: string,
    public readonly roundNumber: number,
    public readonly letter: string,
    public readonly status: string,
    public readonly categories: CategoryInRoundView[],
    public readonly submittedCount: number,
    public readonly closingDeadline: Date | null,
  ) {}
}
