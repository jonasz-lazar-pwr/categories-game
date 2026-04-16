// === src/bootstrap.ts ===

import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '#generated/prisma/client.js'
import { createLogger, createLoggerOptions } from '#/shared/logger.js'
import { createHttpServer } from '#/bootstrap/http.js'
import { bootstrapIdentity } from '#/bootstrap/identity.js'
import { bootstrapGame } from '#/bootstrap/game.js'
import { bootstrapScoring } from '#/bootstrap/scoring.js'
import { bootstrapRound } from '#/bootstrap/round.js'
import { bootstrapSocket } from '#/bootstrap/socket.js'

export async function bootstrap(): Promise<{ shutdown: () => Promise<void> }> {
  const logger = createLogger()
  const app = await createHttpServer(createLoggerOptions())

  const databaseUrl = process.env['DATABASE_URL']
  if (!databaseUrl) {
    logger.error('DATABASE_URL is not set.')
    throw new Error('DATABASE_URL is not set.')
  }
  const adapter = new PrismaPg({ connectionString: databaseUrl })
  const prisma = new PrismaClient({ adapter })

  const { jwtService } = await bootstrapIdentity(app, prisma)
  const {
    gameRepository,
    gameFacade,
    startGameService,
    cancelGameService,
    cancelGameAfterTimeoutService,
  } = await bootstrapGame(app, prisma, jwtService)

  const { Server } = await import('socket.io')
  const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:5173']
  const io = new Server(app.server, { cors: { origin: allowedOrigins, credentials: true } })

  const { scoringFacade, scoringController } = await bootstrapScoring(
    app,
    prisma,
    io,
    gameFacade,
    logger,
  )

  const { startRoundService, submitAnswersService, closeRoundService, roundRepository } =
    await bootstrapRound(app, prisma, gameFacade, scoringFacade)

  await bootstrapSocket(
    app,
    io,
    gameRepository,
    gameFacade,
    startGameService,
    cancelGameService,
    cancelGameAfterTimeoutService,
    startRoundService,
    submitAnswersService,
    closeRoundService,
    roundRepository,
    scoringFacade,
    scoringController,
    logger,
  )

  app.get('/health', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return reply.status(200).send({ status: 'ok' })
    } catch {
      return reply.status(503).send({ status: 'error' })
    }
  })

  const port = Number(process.env['BACKEND_PORT'] ?? 3000)
  await app.listen({ port, host: '0.0.0.0' })
  logger.info({ port }, 'Server started.')

  return {
    shutdown: async (): Promise<void> => {
      await app.close()
      await prisma.$disconnect()
    },
  }
}
