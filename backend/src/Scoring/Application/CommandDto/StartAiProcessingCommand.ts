// === src/Scoring/Application/CommandDto/StartAiProcessingCommand.ts ===

export class StartAiProcessingCommand {
  public constructor(
    public readonly roundId: string,
    public readonly gameId: string,
    public readonly letter: string,
    public readonly closedAnswers: Array<{ playerId: string; categoryId: string; value: string }>,
  ) {}
}
