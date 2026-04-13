// === src/Game/Application/CommandDto/StartGameCommand.ts ===

export class StartGameCommand {
  public constructor(
    public readonly gameId: string,
    public readonly requesterId: string,
  ) {}
}
