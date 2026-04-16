// === src/Game/Application/CommandDto/JoinGameCommand.ts ===

export class JoinGameCommand {
  public constructor(
    public readonly newPlayerId: string,
    public readonly gameCode: string,
    public readonly userId: string | null,
    public readonly nick: string | undefined,
  ) {}
}
