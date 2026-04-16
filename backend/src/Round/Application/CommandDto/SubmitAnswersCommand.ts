// === src/Round/Application/CommandDto/SubmitAnswersCommand.ts ===

export class SubmitAnswersCommand {
  public constructor(
    public readonly roundId: string,
    public readonly playerId: string,
    public readonly answers: Record<string, string>,
    public readonly closingTimeSeconds: number,
  ) {}
}
