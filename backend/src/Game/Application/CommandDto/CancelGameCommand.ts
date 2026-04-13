// === src/Game/Application/CommandDto/CancelGameCommand.ts ===

export class CancelGameCommand {
  public constructor(
    public readonly gameId: string,
    public readonly requesterId: string,
  ) {}
}
