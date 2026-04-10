// === src/Identity/Domain/UserAggregate.ts ===

import type { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import type { UserEmailVo } from '#/Identity/Domain/ValueObjects/UserEmailVo.js'
import type { UserNickVo } from '#/Identity/Domain/ValueObjects/UserNickVo.js'
import type { UserPasswordHashVo } from '#/Identity/Domain/ValueObjects/UserPasswordHashVo.js'

export class UserAggregate {
  private constructor(
    public readonly id: UserIdVo,
    public readonly email: UserEmailVo,
    private nick: UserNickVo,
    private readonly passwordHash: UserPasswordHashVo,
    public readonly createdAt: Date,
  ) {}

  public static create(
    id: UserIdVo,
    email: UserEmailVo,
    nick: UserNickVo,
    passwordHash: UserPasswordHashVo,
  ): UserAggregate {
    return new UserAggregate(id, email, nick, passwordHash, new Date())
  }

  public static restore(
    id: UserIdVo,
    email: UserEmailVo,
    nick: UserNickVo,
    passwordHash: UserPasswordHashVo,
    createdAt: Date,
  ): UserAggregate {
    return new UserAggregate(id, email, nick, passwordHash, createdAt)
  }

  public changeNick(nick: UserNickVo): void {
    this.nick = nick
  }

  public getNick(): UserNickVo {
    return this.nick
  }

  public getPasswordHash(): UserPasswordHashVo {
    return this.passwordHash
  }
}
