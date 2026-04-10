// === src/Identity/Application/CommandDto/ChangeNickCommand.ts ===

export class ChangeNickCommand {
  public constructor(
    public readonly userId: string,
    public readonly newNick: string,
  ) {}
}
