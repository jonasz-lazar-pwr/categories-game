// === src/Game/Infrastructure/Prisma/GamePrismaRepository.ts ===

import { GameAggregate } from '#/Game/Domain/GameAggregate.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { GameCodeVo } from '#/Game/Domain/ValueObjects/GameCodeVo.js'
import { RoundCountVo } from '#/Game/Domain/ValueObjects/RoundCountVo.js'
import { CategoryIdVo } from '#/Game/Domain/ValueObjects/CategoryIdVo.js'
import { CategoryConfig } from '#/Game/Domain/Entities/CategoryConfig.js'
import { ScoringConfig } from '#/Game/Domain/Entities/ScoringConfig.js'
import { PlayerEntry } from '#/Game/Domain/Entities/PlayerEntry.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { GameStatus } from '#/Game/Domain/ValueObjects/GameStatusVo.js'
import { AlphabetPreset } from '#/Game/Domain/ValueObjects/AlphabetPresetVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { PrismaClient } from '#generated/prisma/client.js'

type GameWithRelations = Awaited<ReturnType<GamePrismaRepository['findRaw']>>

export class GamePrismaRepository implements IGameRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: GameIdVo): Promise<GameAggregate | null> {
    const raw = await this.findRaw({ id: id.value })
    if (raw === null) return null
    return this.toAggregate(raw)
  }

  public async findByCode(code: GameCodeVo): Promise<GameAggregate | null> {
    const raw = await this.findRaw({ code: code.value })
    if (raw === null) return null
    return this.toAggregate(raw)
  }

  public async save(game: GameAggregate): Promise<void> {
    await this.prisma.game.upsert({
      where: { id: game.id.value },
      create: {
        id: game.id.value,
        code: game.code.value,
        status: game.status,
        hostId: game.hostId.value,
        alphabetPreset: game.alphabetPreset,
        roundCount: game.roundCount.value,
        currentRoundNumber: game.currentRoundNumber,
        usedLetters: [...game.usedLetters],
        uniqueOnlyPoints: game.scoringConfig.uniqueOnlyPoints,
        uniquePoints: game.scoringConfig.uniquePoints,
        duplicatePoints: game.scoringConfig.duplicatePoints,
        closingTimeSeconds: game.scoringConfig.closingTimeSeconds,
        verificationTimeoutSeconds: game.scoringConfig.verificationTimeoutSeconds,
        waitingForHostTimeoutSeconds: game.scoringConfig.waitingForHostTimeoutSeconds,
        players: {
          create: game.players.map((p) => ({
            id: p.playerId.value,
            userId: p.userId?.value ?? null,
            nick: p.nick,
            isHost: p.isHost,
            isConnected: p.isConnected,
            socketId: p.socketId,
            score: p.score,
          })),
        },
        categories: {
          create: game.categories.map((c) => ({
            id: `${game.id.value}-${c.categoryId.value}`,
            categoryId: c.categoryId.value,
            name: c.name,
            description: c.description,
          })),
        },
      },
      update: {
        status: game.status,
        currentRoundNumber: game.currentRoundNumber,
        usedLetters: [...game.usedLetters],
        players: {
          upsert: game.players.map((p) => ({
            where: { id: p.playerId.value },
            create: {
              id: p.playerId.value,
              userId: p.userId?.value ?? null,
              nick: p.nick,
              isHost: p.isHost,
              isConnected: p.isConnected,
              socketId: p.socketId,
              score: p.score,
            },
            update: {
              isConnected: p.isConnected,
              socketId: p.socketId,
              score: p.score,
            },
          })),
        },
      },
    })
  }

  // === Private Helpers ===

  private isGameStatus(value: string): value is GameStatus {
    return Object.values(GameStatus).includes(value as GameStatus)
  }

  private isAlphabetPreset(value: string): value is AlphabetPreset {
    return Object.values(AlphabetPreset).includes(value as AlphabetPreset)
  }

  private async findRaw(where: { id: string } | { code: string }) {
    return this.prisma.game.findUnique({
      where,
      include: { players: true, categories: true },
    })
  }

  private toAggregate(raw: NonNullable<GameWithRelations>): GameAggregate {
    const players = raw.players.map(
      (p) =>
        new PlayerEntry(
          new PlayerIdVo(p.id),
          p.userId !== null ? new UserIdVo(p.userId) : null,
          p.nick,
          p.isHost,
          p.isConnected,
          p.socketId,
          p.score,
        ),
    )

    const categories = raw.categories.map(
      (c) => new CategoryConfig(new CategoryIdVo(c.categoryId), c.name, c.description),
    )

    const scoringConfig = new ScoringConfig(
      raw.uniqueOnlyPoints,
      raw.uniquePoints,
      raw.duplicatePoints,
      raw.closingTimeSeconds,
      raw.verificationTimeoutSeconds,
      raw.waitingForHostTimeoutSeconds,
    )

    if (!this.isGameStatus(raw.status)) {
      throw new InvalidArgumentError(`Unknown game status: ${raw.status}`)
    }
    if (!this.isAlphabetPreset(raw.alphabetPreset)) {
      throw new InvalidArgumentError(`Unknown alphabet preset: ${raw.alphabetPreset}`)
    }

    return GameAggregate.restore(
      new GameIdVo(raw.id),
      new GameCodeVo(raw.code),
      raw.status,
      new PlayerIdVo(raw.hostId),
      raw.alphabetPreset,
      new RoundCountVo(raw.roundCount),
      raw.usedLetters,
      raw.currentRoundNumber,
      players,
      categories,
      scoringConfig,
    )
  }
}
