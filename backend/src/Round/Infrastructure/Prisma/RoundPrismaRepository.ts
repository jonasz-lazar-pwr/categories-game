// === src/Round/Infrastructure/Prisma/RoundPrismaRepository.ts ===

import { RoundAggregate, PlayerAnswers } from '#/Round/Domain/RoundAggregate.js'
import { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import { RoundLetterVo } from '#/Round/Domain/ValueObjects/RoundLetterVo.js'
import { RoundStatus } from '#/Round/Domain/ValueObjects/RoundStatusVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import type { IRoundRepository } from '#/Round/Domain/RoundRepository.js'
import type { PrismaClient } from '#generated/prisma/client.js'

type RoundWithRelations = Awaited<ReturnType<RoundPrismaRepository['findRaw']>>

// DB status 'verification' is owned by the Scoring domain. During restore we treat
// both 'finished' and 'verification' as RoundStatus.finished in the domain.
function toRoundStatus(raw: string): RoundStatus {
  if (raw === 'answering') return RoundStatus.answering
  if (raw === 'closing') return RoundStatus.closing
  return RoundStatus.finished
}

export class RoundPrismaRepository implements IRoundRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: RoundIdVo): Promise<RoundAggregate | null> {
    const raw = await this.findRaw({ id: id.value })
    if (raw === null) return null
    return this.toAggregate(raw)
  }

  public async findByGameId(gameId: GameIdVo): Promise<RoundAggregate[]> {
    const rows = await this.prisma.round.findMany({
      where: { gameId: gameId.value },
      orderBy: { roundNumber: 'asc' },
      include: { playerAnswers: { include: { answers: true } } },
    })
    return rows.map((r) => this.toAggregate(r))
  }

  public async findClosingWithDeadlineAfter(now: Date): Promise<RoundAggregate[]> {
    const rows = await this.prisma.round.findMany({
      where: { status: 'closing', closingDeadline: { gt: now } },
      include: { playerAnswers: { include: { answers: true } } },
    })
    return rows.map((r) => this.toAggregate(r))
  }

  public async save(round: RoundAggregate): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.round.upsert({
        where: { id: round.id.value },
        create: {
          id: round.id.value,
          gameId: round.gameId.value,
          roundNumber: round.roundNumber,
          letter: round.letter.value,
          status: round.status,
          closingDeadline: round.closingDeadline,
        },
        update: {
          status: round.status,
          closingDeadline: round.closingDeadline,
        },
      })

      for (const pa of round.getSubmittedAnswers()) {
        const playerAnswersRow = await tx.playerAnswers.upsert({
          where: {
            roundId_playerId: { roundId: round.id.value, playerId: pa.playerId.value },
          },
          create: {
            roundId: round.id.value,
            playerId: pa.playerId.value,
            submittedAt: pa.submittedAt,
          },
          update: {
            submittedAt: pa.submittedAt,
          },
        })

        for (const [categoryId, value] of pa.answers) {
          await tx.answer.upsert({
            where: {
              playerAnswersId_gameCategoryId: {
                playerAnswersId: playerAnswersRow.id,
                gameCategoryId: categoryId,
              },
            },
            create: {
              playerAnswersId: playerAnswersRow.id,
              gameCategoryId: categoryId,
              value,
            },
            update: { value },
          })
        }
      }
    })
  }

  // === Private Helpers ===

  private async findRaw(where: { id: string }) {
    return this.prisma.round.findUnique({
      where,
      include: { playerAnswers: { include: { answers: true } } },
    })
  }

  private toAggregate(raw: NonNullable<RoundWithRelations>): RoundAggregate {
    const playerAnswers = raw.playerAnswers.map((pa) => {
      const answersMap = new Map<string, string>(pa.answers.map((a) => [a.gameCategoryId, a.value]))
      return new PlayerAnswers(new PlayerIdVo(pa.playerId), answersMap, pa.submittedAt)
    })

    return RoundAggregate.restore(
      new RoundIdVo(raw.id),
      new GameIdVo(raw.gameId),
      raw.roundNumber,
      new RoundLetterVo(raw.letter),
      toRoundStatus(raw.status),
      raw.closingDeadline,
      playerAnswers,
    )
  }
}
