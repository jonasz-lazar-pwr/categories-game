// === src/Scoring/Application/CommandDto/CastVoteCommand.ts ===

export class CastVoteCommand {
  public constructor(
    public readonly verificationId: string,
    public readonly voterId: string,
    public readonly accepted: boolean,
  ) {}
}
