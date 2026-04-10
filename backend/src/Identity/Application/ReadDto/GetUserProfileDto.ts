// === src/Identity/Application/ReadDto/GetUserProfileDto.ts ===

export class GetUserProfileDto {
  public constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly nick: string,
    public readonly createdAt: Date,
  ) {}
}
