// === src/Round/Infrastructure/Prisma/GetCurrentRoundPrismaQuery.ts ===

import { RoundStateView } from '#/Round/Application/ReadDto/RoundStateView.js'
import { CategoryInRoundView } from '#/Round/Application/View/CategoryInRoundView.js'
import type { IGetCurrentRoundQuery } from '#/Round/Application/GetCurrentRoundQuery.js'
import type { PrismaClient } from '#generated/prisma/client.js'

export class GetCurrentRoundPrismaQuery implements IGetCurrentRoundQuery {
  public constructor(private readonly prisma: PrismaClient) {}

  public async execute(gameId: string): Promise<RoundStateView | null> {
    const [round, game] = await Promise.all([
      this.prisma.round.findFirst({
        where: { gameId, status: { not: 'finished' } },
        orderBy: { roundNumber: 'desc' },
        include: { playerAnswers: { select: { submittedAt: true } } },
      }),
      this.prisma.game.findUnique({
        where: { id: gameId },
        include: { categories: true },
      }),
    ])

    if (round === null || game === null) return null

    const submittedCount = round.playerAnswers.filter((pa) => pa.submittedAt !== null).length
    const categories = game.categories.map(
      (c) => new CategoryInRoundView(c.categoryId, c.name, c.description),
    )

    return new RoundStateView(
      round.id,
      round.roundNumber,
      round.letter,
      round.status,
      categories,
      submittedCount,
      round.closingDeadline,
    )
  }
}
