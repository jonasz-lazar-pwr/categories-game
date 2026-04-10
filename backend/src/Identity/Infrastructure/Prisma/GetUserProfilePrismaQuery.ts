// === src/Identity/Infrastructure/Prisma/GetUserProfilePrismaQuery.ts ===

import { GetUserProfileDto } from '#/Identity/Application/ReadDto/GetUserProfileDto.js'
import type { GetUserProfileQuery } from '#/Identity/Application/GetUserProfileQuery.js'
import type { PrismaClient } from '#generated/prisma/client.js'

export class GetUserProfilePrismaQuery implements GetUserProfileQuery {
  public constructor(private readonly prisma: PrismaClient) {}

  public async execute(userId: string): Promise<GetUserProfileDto | null> {
    const raw = await this.prisma.user.findUnique({ where: { id: userId } })
    if (raw === null) return null
    return new GetUserProfileDto(raw.id, raw.email, raw.nick, raw.createdAt)
  }
}
