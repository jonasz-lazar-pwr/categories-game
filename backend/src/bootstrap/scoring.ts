// === src/bootstrap/scoring.ts ===

import { VerificationPrismaRepository } from '#/Scoring/Infrastructure/Prisma/VerificationPrismaRepository.js'
import { GetVerificationStatePrismaQuery } from '#/Scoring/Infrastructure/Prisma/GetVerificationStatePrismaQuery.js'
import { AnthropicAiService } from '#/Scoring/Infrastructure/AiService.js'
import { ScoringFacade } from '#/Scoring/Infrastructure/ScoringFacade.js'
import { StartAiProcessingService } from '#/Scoring/Application/StartAiProcessingService.js'
import { CastVoteService } from '#/Scoring/Application/CastVoteService.js'
import { AdvanceCursorService } from '#/Scoring/Application/AdvanceCursorService.js'
import { ScoringController } from '#/Presentation/Scoring/scoringSocketHandler.js'
import { getVerificationStateRoute } from '#/Presentation/Scoring/getVerificationStateRoute.js'
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '#generated/prisma/client.js'
import type { Server } from 'socket.io'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'
import type { IScoringFacade } from '#/Round/Domain/ScoringFacade.js'
import type pino from 'pino'

export interface IScoringBootstrapResult {
  scoringFacade: IScoringFacade
  scoringController: ScoringController
}

export async function bootstrapScoring(
  app: FastifyInstance,
  prisma: PrismaClient,
  io: Server,
  gameFacade: IGameFacade,
  logger: pino.Logger,
): Promise<IScoringBootstrapResult> {
  const verificationRepository = new VerificationPrismaRepository(prisma)
  const getVerificationStateQuery = new GetVerificationStatePrismaQuery(prisma)
  await app.register(getVerificationStateRoute(getVerificationStateQuery))
  const anthropicApiKey = process.env['ANTHROPIC_API_KEY']
  if (!anthropicApiKey) {
    logger.error('ANTHROPIC_API_KEY is not set.')
    throw new Error('ANTHROPIC_API_KEY is not set.')
  }
  const aiService = new AnthropicAiService(anthropicApiKey)

  const advanceCursorService = new AdvanceCursorService(verificationRepository, gameFacade)
  const castVoteService = new CastVoteService(verificationRepository, gameFacade)

  const scoringController = new ScoringController(
    io,
    castVoteService,
    advanceCursorService,
    gameFacade,
    logger.child({ context: 'scoring' }),
  )

  const startAiProcessingService = new StartAiProcessingService(
    verificationRepository,
    aiService,
    gameFacade,
    scoringController.eventEmitter,
  )

  const scoringFacade = new ScoringFacade(startAiProcessingService)

  return { scoringFacade, scoringController }
}
