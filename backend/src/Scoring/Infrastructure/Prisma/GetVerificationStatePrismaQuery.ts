// === src/Scoring/Infrastructure/Prisma/GetVerificationStatePrismaQuery.ts ===

import { AnswerVerificationItemView } from '#/Scoring/Application/View/AnswerVerificationItemView.js'
import { VerificationStateView } from '#/Scoring/Application/View/VerificationStateView.js'
import type { IGetVerificationStateQuery } from '#/Scoring/Application/GetVerificationStateQuery.js'
import type { PrismaClient } from '#generated/prisma/client.js'

export class GetVerificationStatePrismaQuery implements IGetVerificationStateQuery {
  public constructor(private readonly prisma: PrismaClient) {}

  public async execute(verificationId: string): Promise<VerificationStateView | null> {
    const raw = await this.prisma.verification.findUnique({
      where: { id: verificationId },
      include: { items: { include: { votes: true } } },
    })
    if (raw === null) return null

    const items = raw.items.map(
      (item) =>
        new AnswerVerificationItemView(
          item.playerId,
          item.gameCategoryId,
          item.value,
          item.aiScore,
          item.aiReasoning,
          item.isAccepted,
          item.isResolved,
        ),
    )

    return new VerificationStateView(
      raw.id,
      raw.status,
      raw.cursorPlayerId,
      raw.cursorCategoryId,
      items,
    )
  }
}
