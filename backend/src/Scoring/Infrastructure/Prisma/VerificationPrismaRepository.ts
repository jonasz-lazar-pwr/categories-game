// === src/Scoring/Infrastructure/Prisma/VerificationPrismaRepository.ts ===

import {
  VerificationAggregate,
  AnswerVerificationItem,
  Vote,
} from '#/Scoring/Domain/VerificationAggregate.js'
import { VerificationIdVo } from '#/Scoring/Domain/ValueObjects/VerificationIdVo.js'
import { VerificationStatus } from '#/Scoring/Domain/ValueObjects/VerificationStatusVo.js'
import { AiScoreVo } from '#/Scoring/Domain/ValueObjects/AiScoreVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import type { IVerificationRepository } from '#/Scoring/Domain/VerificationRepository.js'
import type { PrismaClient } from '#generated/prisma/client.js'
import { VerificationStatus as PrismaVerificationStatus } from '#generated/prisma/enums.js'

interface PrismaVote {
  id: string
  voterId: string
  accepted: boolean
  answerVerificationId: string
  createdAt: Date
}

interface PrismaAnswerVerification {
  id: string
  verificationId: string
  playerId: string
  gameCategoryId: string
  value: string
  aiScore: number | null
  aiReasoning: string | null
  isAccepted: boolean | null
  isResolved: boolean
  createdAt: Date
  updatedAt: Date
  votes: PrismaVote[]
}

interface PrismaVerificationWithItems {
  id: string
  roundId: string
  gameId: string
  status: string
  cursorPlayerId: string | null
  cursorCategoryId: string | null
  createdAt: Date
  updatedAt: Date
  items: PrismaAnswerVerification[]
}

export class VerificationPrismaRepository implements IVerificationRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: VerificationIdVo): Promise<VerificationAggregate | null> {
    const raw = await this.prisma.verification.findUnique({
      where: { id: id.value },
      include: { items: { include: { votes: true } } },
    })
    if (raw === null) return null
    return this.toAggregate(raw as PrismaVerificationWithItems)
  }

  public async findByRoundId(roundId: RoundIdVo): Promise<VerificationAggregate | null> {
    const raw = await this.prisma.verification.findUnique({
      where: { roundId: roundId.value },
      include: { items: { include: { votes: true } } },
    })
    if (raw === null) return null
    return this.toAggregate(raw as PrismaVerificationWithItems)
  }

  public async save(verification: VerificationAggregate): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const status = verification.status as PrismaVerificationStatus
      await tx.verification.upsert({
        where: { id: verification.id.value },
        create: {
          id: verification.id.value,
          roundId: verification.roundId.value,
          gameId: verification.gameId.value,
          status,
          cursorPlayerId: verification.cursorPlayerId?.value ?? null,
          cursorCategoryId: verification.cursorCategoryId ?? null,
        },
        update: {
          status,
          cursorPlayerId: verification.cursorPlayerId?.value ?? null,
          cursorCategoryId: verification.cursorCategoryId ?? null,
        },
      })

      for (const item of verification.items) {
        await tx.answerVerification.upsert({
          where: { id: item.id },
          create: {
            id: item.id,
            verificationId: verification.id.value,
            playerId: item.playerId.value,
            gameCategoryId: item.categoryId,
            value: item.value,
            aiScore: item.aiScore?.value ?? null,
            aiReasoning: item.aiReasoning,
            isAccepted: item.isAccepted,
            isResolved: item.isResolved,
          },
          update: {
            aiScore: item.aiScore?.value ?? null,
            aiReasoning: item.aiReasoning,
            isAccepted: item.isAccepted,
            isResolved: item.isResolved,
          },
        })

        for (const vote of item.votes) {
          await tx.vote.upsert({
            where: {
              answerVerificationId_voterId: {
                answerVerificationId: item.id,
                voterId: vote.voterId.value,
              },
            },
            create: {
              answerVerificationId: item.id,
              voterId: vote.voterId.value,
              accepted: vote.accepted,
            },
            update: {},
          })
        }
      }
    })
  }

  public async saveAiResult(itemId: string, aiScore: number, aiReasoning: string): Promise<void> {
    await this.prisma.answerVerification.update({
      where: { id: itemId },
      data: { aiScore, aiReasoning },
    })
  }

  // === Private Helpers ===

  private toAggregate(raw: PrismaVerificationWithItems): VerificationAggregate {
    const items = raw.items.map((item) => {
      const votes = item.votes.map((v) => new Vote(new PlayerIdVo(v.voterId), v.accepted))
      return new AnswerVerificationItem(
        item.id,
        new PlayerIdVo(item.playerId),
        item.gameCategoryId,
        item.value,
        item.aiScore !== null ? new AiScoreVo(item.aiScore) : null,
        item.aiReasoning,
        votes,
        item.isAccepted,
        item.isResolved,
      )
    })

    return VerificationAggregate.restore(
      new VerificationIdVo(raw.id),
      new RoundIdVo(raw.roundId),
      new GameIdVo(raw.gameId),
      this.toStatus(raw.status),
      raw.cursorPlayerId !== null ? new PlayerIdVo(raw.cursorPlayerId) : null,
      raw.cursorCategoryId,
      items,
    )
  }

  private toStatus(raw: string): VerificationStatus {
    if (raw === 'ai_processing') return VerificationStatus.ai_processing
    if (raw === 'in_progress') return VerificationStatus.in_progress
    return VerificationStatus.finished
  }
}
