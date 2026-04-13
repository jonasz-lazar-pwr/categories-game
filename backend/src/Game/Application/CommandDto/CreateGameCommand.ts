// === src/Game/Application/CommandDto/CreateGameCommand.ts ===

export class CreateGameCommand {
  public constructor(
    public readonly gameId: string,
    public readonly newPlayerId: string,
    public readonly hostUserId: string,
    public readonly hostNick: string,
    public readonly code: string,
    public readonly alphabetPreset: string,
    public readonly roundCount: number,
    public readonly categoryIds: string[],
    public readonly uniqueOnlyPoints: number,
    public readonly uniquePoints: number,
    public readonly duplicatePoints: number,
    public readonly closingTimeSeconds: number,
    public readonly verificationTimeoutSeconds: number,
    public readonly waitingForHostTimeoutSeconds: number,
  ) {}
}
