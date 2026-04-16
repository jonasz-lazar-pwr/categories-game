// === src/bootstrap/round.ts ===

import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '#generated/prisma/client.js'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'
import type { IScoringFacade } from '#/Round/Domain/ScoringFacade.js'
import type { IRoundFacade } from '#/Round/Domain/RoundFacade.js'
import type { IStartRoundService } from '#/Round/Application/StartRoundService.js'
import type { ISubmitAnswersService } from '#/Round/Application/SubmitAnswersService.js'
import type { ICloseRoundService } from '#/Round/Application/CloseRoundService.js'
import type { IRoundRepository } from '#/Round/Domain/RoundRepository.js'
import { RoundPrismaRepository } from '#/Round/Infrastructure/Prisma/RoundPrismaRepository.js'
import { GetCurrentRoundPrismaQuery } from '#/Round/Infrastructure/Prisma/GetCurrentRoundPrismaQuery.js'
import { RoundFacade } from '#/Round/Infrastructure/RoundFacade.js'
import { StartRoundService } from '#/Round/Application/StartRoundService.js'
import { SubmitAnswersService } from '#/Round/Application/SubmitAnswersService.js'
import { CloseRoundService } from '#/Round/Application/CloseRoundService.js'
import { getCurrentRoundRoute } from '#/Presentation/Round/getCurrentRoundRoute.js'

export interface IRoundBootstrapResult {
  roundFacade: IRoundFacade
  roundRepository: IRoundRepository
  startRoundService: IStartRoundService
  submitAnswersService: ISubmitAnswersService
  closeRoundService: ICloseRoundService
}

export async function bootstrapRound(
  app: FastifyInstance,
  prisma: PrismaClient,
  gameFacade: IGameFacade,
  _scoringFacade: IScoringFacade,
): Promise<IRoundBootstrapResult> {
  const roundRepository = new RoundPrismaRepository(prisma)
  const getCurrentRoundQuery = new GetCurrentRoundPrismaQuery(prisma)

  const startRoundService = new StartRoundService(gameFacade, roundRepository)
  const submitAnswersService = new SubmitAnswersService(roundRepository)
  const closeRoundService = new CloseRoundService(roundRepository)

  const roundFacade = new RoundFacade(prisma)

  await app.register(getCurrentRoundRoute(getCurrentRoundQuery))

  return {
    roundFacade,
    roundRepository,
    startRoundService,
    submitAnswersService,
    closeRoundService,
  }
}
