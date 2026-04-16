// === src/Game/Application/CommandDto/CancelGameAfterTimeoutCommand.ts ===

export class CancelGameAfterTimeoutCommand {
  public constructor(
    public readonly gameId: string,
    public readonly requesterId: string,
  ) {}
}
