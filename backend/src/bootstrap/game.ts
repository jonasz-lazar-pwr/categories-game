// === src/bootstrap/game.ts ===

import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '#generated/prisma/client.js'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { IStartGameService } from '#/Game/Application/StartGameService.js'
import type { ICancelGameService } from '#/Game/Application/CancelGameService.js'
import { GamePrismaRepository } from '#/Game/Infrastructure/Prisma/GamePrismaRepository.js'
import { CategoryPrismaRepository } from '#/Game/Infrastructure/Prisma/CategoryPrismaRepository.js'
import { GetGamePrismaQuery } from '#/Game/Infrastructure/Prisma/GetGamePrismaQuery.js'
import { CreateGameService } from '#/Game/Application/CreateGameService.js'
import { JoinGameService } from '#/Game/Application/JoinGameService.js'
import { StartGameService } from '#/Game/Application/StartGameService.js'
import { CancelGameService } from '#/Game/Application/CancelGameService.js'
import { createGameRoute } from '#/Presentation/Game/createGameRoute.js'
import { joinGameRoute } from '#/Presentation/Game/joinGameRoute.js'
import { getGameRoute } from '#/Presentation/Game/getGameRoute.js'

export interface GameBootstrapResult {
  gameRepository: IGameRepository
  startGameService: IStartGameService
  cancelGameService: ICancelGameService
}

export async function bootstrapGame(
  app: FastifyInstance,
  prisma: PrismaClient,
  jwtService: IJwtService,
): Promise<GameBootstrapResult> {
  const gameRepository = new GamePrismaRepository(prisma)
  const categoryRepository = new CategoryPrismaRepository(prisma)
  const getGameQuery = new GetGamePrismaQuery(prisma)

  const createGameService = new CreateGameService(gameRepository, categoryRepository)
  const joinGameService = new JoinGameService(gameRepository)
  const startGameService = new StartGameService(gameRepository)
  const cancelGameService = new CancelGameService(gameRepository)

  await app.register(createGameRoute(jwtService, createGameService))
  await app.register(joinGameRoute(jwtService, joinGameService))
  await app.register(getGameRoute(getGameQuery))

  return { gameRepository, startGameService, cancelGameService }
}
