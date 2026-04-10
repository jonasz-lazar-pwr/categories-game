// === src/Identity/Application/CommandDto/LoginUserCommand.ts ===

export class LoginUserCommand {
  public constructor(
    public readonly email: string,
    public readonly plainPassword: string,
  ) {}
}
