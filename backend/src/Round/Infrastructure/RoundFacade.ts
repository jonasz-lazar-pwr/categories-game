// === src/Round/Infrastructure/RoundFacade.ts ===

import type { IRoundFacade, IClosedAnswerDto } from '#/Round/Domain/RoundFacade.js'
import type { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import type { PrismaClient } from '#generated/prisma/client.js'

export class RoundFacade implements IRoundFacade {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getClosedAnswers(roundId: RoundIdVo): Promise<IClosedAnswerDto[]> {
    const playerAnswers = await this.prisma.playerAnswers.findMany({
      where: { roundId: roundId.value, submittedAt: { not: null } },
      include: { answers: true },
    })

    return playerAnswers.flatMap((pa) =>
      pa.answers.map((a) => ({
        playerId: pa.playerId,
        categoryId: a.gameCategoryId,
        value: a.value,
      })),
    )
  }
}
