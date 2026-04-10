// === src/Identity/Infrastructure/Prisma/UserPrismaRepository.ts ===

import { UserAggregate } from '#/Identity/Domain/UserAggregate.js'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { UserEmailVo } from '#/Identity/Domain/ValueObjects/UserEmailVo.js'
import { UserNickVo } from '#/Identity/Domain/ValueObjects/UserNickVo.js'
import { UserPasswordHashVo } from '#/Identity/Domain/ValueObjects/UserPasswordHashVo.js'
import type { UserRepository } from '#/Identity/Domain/UserRepository.js'
import type { PrismaClient } from '#generated/prisma/client.js'

export class UserPrismaRepository implements UserRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: UserIdVo): Promise<UserAggregate | null> {
    const raw = await this.prisma.user.findUnique({ where: { id: id.value } })
    if (raw === null) return null
    return this.toAggregate(raw)
  }

  public async findByEmail(email: UserEmailVo): Promise<UserAggregate | null> {
    const raw = await this.prisma.user.findUnique({ where: { email: email.value } })
    if (raw === null) return null
    return this.toAggregate(raw)
  }

  public async save(user: UserAggregate): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: user.id.value },
      create: {
        id: user.id.value,
        email: user.email.value,
        nick: user.getNick().value,
        password: user.getPasswordHash().value,
        createdAt: user.createdAt,
      },
      update: {
        // All mutable aggregate fields must be listed here explicitly.
        nick: user.getNick().value,
      },
    })
  }

  // === Private Helpers ===

  private toAggregate(raw: {
    id: string
    email: string
    nick: string
    password: string
    createdAt: Date
  }): UserAggregate {
    return UserAggregate.restore(
      new UserIdVo(raw.id),
      new UserEmailVo(raw.email),
      new UserNickVo(raw.nick),
      new UserPasswordHashVo(raw.password),
      raw.createdAt,
    )
  }
}
