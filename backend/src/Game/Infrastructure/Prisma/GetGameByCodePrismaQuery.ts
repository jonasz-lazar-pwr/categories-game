// === src/Game/Infrastructure/Prisma/GetGameByCodePrismaQuery.ts ===

import { GameLobbyDto } from '#/Game/Application/ReadDto/GameLobbyDto.js'
import { PlayerInLobbyView } from '#/Game/Application/View/PlayerInLobbyView.js'
import { CategoryInLobbyView } from '#/Game/Application/View/CategoryInLobbyView.js'
import { ScoringConfigView } from '#/Game/Application/View/ScoringConfigView.js'
import type { IGetGameByCodeQuery } from '#/Game/Application/GetGameByCodeQuery.js'
import type { PrismaClient } from '#generated/prisma/client.js'

export class GetGameByCodePrismaQuery implements IGetGameByCodeQuery {
  public constructor(private readonly prisma: PrismaClient) {}

  public async execute(code: string): Promise<GameLobbyDto | null> {
    const raw = await this.prisma.game.findUnique({
      where: { code },
      include: { players: true, categories: true },
    })
    if (raw === null) return null
    return this.toDto(raw)
  }

  // === Private Helpers ===

  private toDto(raw: {
    id: string
    code: string
    status: string
    hostId: string
    alphabetPreset: string
    roundCount: number
    currentRoundNumber: number
    uniqueOnlyPoints: number
    uniquePoints: number
    duplicatePoints: number
    closingTimeSeconds: number
    verificationTimeoutSeconds: number
    waitingForHostTimeoutSeconds: number
    players: { id: string; nick: string; isHost: boolean; isConnected: boolean }[]
    categories: { categoryId: string; name: string; description: string }[]
  }): GameLobbyDto {
    return new GameLobbyDto(
      raw.id,
      raw.code,
      raw.status,
      raw.hostId,
      raw.alphabetPreset,
      raw.roundCount,
      raw.currentRoundNumber,
      raw.players.map((p) => new PlayerInLobbyView(p.id, p.nick, p.isHost, p.isConnected)),
      raw.categories.map((c) => new CategoryInLobbyView(c.categoryId, c.name, c.description)),
      new ScoringConfigView(
        raw.uniqueOnlyPoints,
        raw.uniquePoints,
        raw.duplicatePoints,
        raw.closingTimeSeconds,
        raw.verificationTimeoutSeconds,
        raw.waitingForHostTimeoutSeconds,
      ),
    )
  }
}
