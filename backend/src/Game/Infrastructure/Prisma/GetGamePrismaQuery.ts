// === src/Game/Infrastructure/Prisma/GetGamePrismaQuery.ts ===

import { GamePublicDto } from '#/Game/Application/ReadDto/GamePublicDto.js'
import type { IGetGameQuery } from '#/Game/Application/GetGameQuery.js'
import type { PrismaClient } from '#generated/prisma/client.js'

export class GetGamePrismaQuery implements IGetGameQuery {
  public constructor(private readonly prisma: PrismaClient) {}

  public async execute(gameId: string): Promise<GamePublicDto | null> {
    const raw = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        code: true,
        status: true,
        hostId: true,
        roundCount: true,
        currentRoundNumber: true,
        players: { select: { nick: true, isHost: true, isConnected: true } },
        categories: { select: { categoryId: true, name: true } },
      },
    })
    if (raw === null) return null
    return new GamePublicDto(
      raw.id,
      raw.code,
      raw.status,
      raw.hostId,
      raw.roundCount,
      raw.currentRoundNumber,
      raw.categories,
      raw.players,
    )
  }
}
