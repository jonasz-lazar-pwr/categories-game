// === src/Identity/Application/CommandDto/RegisterUserCommand.ts ===

export class RegisterUserCommand {
  public constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly nick: string,
    public readonly passwordHash: string,
  ) {}
}
