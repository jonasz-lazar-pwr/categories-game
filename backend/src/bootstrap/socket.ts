// === src/bootstrap/socket.ts ===

import { StartRoundCommand } from '#/Round/Application/CommandDto/StartRoundCommand.js'
import { CloseRoundCommand } from '#/Round/Application/CommandDto/CloseRoundCommand.js'
import { registerGameSocketHandler } from '#/Presentation/Game/gameSocketHandler.js'
import { registerRoundSocketHandler } from '#/Presentation/Round/roundSocketHandler.js'
import type { Server } from 'socket.io'
import type { FastifyInstance } from 'fastify'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'
import type { IStartGameService } from '#/Game/Application/StartGameService.js'
import type { ICancelGameService } from '#/Game/Application/CancelGameService.js'
import type { ICancelGameAfterTimeoutService } from '#/Game/Application/CancelGameAfterTimeoutService.js'
import type { IStartRoundService } from '#/Round/Application/StartRoundService.js'
import type { ISubmitAnswersService } from '#/Round/Application/SubmitAnswersService.js'
import type { ICloseRoundService } from '#/Round/Application/CloseRoundService.js'
import type { IRoundRepository } from '#/Round/Domain/RoundRepository.js'
import type { IScoringFacade } from '#/Round/Domain/ScoringFacade.js'
import type { ScoringController } from '#/Presentation/Scoring/scoringSocketHandler.js'
import type pino from 'pino'

export async function bootstrapSocket(
  _app: FastifyInstance,
  io: Server,
  gameRepository: IGameRepository,
  gameFacade: IGameFacade,
  startGameService: IStartGameService,
  cancelGameService: ICancelGameService,
  cancelGameAfterTimeoutService: ICancelGameAfterTimeoutService,
  startRoundService: IStartRoundService,
  submitAnswersService: ISubmitAnswersService,
  closeRoundService: ICloseRoundService,
  roundRepository: IRoundRepository,
  scoringFacade: IScoringFacade,
  scoringController: ScoringController,
  logger: pino.Logger,
): Promise<void> {
  const closingTimers = new Map<string, ReturnType<typeof setTimeout>>()

  async function executeCloseRound(roundId: string, gameId: string): Promise<void> {
    try {
      const result = await closeRoundService.execute(new CloseRoundCommand(roundId))
      io.to(gameId).emit('round:closed')
      await scoringFacade.startAiProcessing(roundId, gameId, result.letter, result.closedAnswers)
    } catch (err) {
      logger.error({ err, roundId, gameId }, 'Failed to close round')
    }
  }

  const onGameStarted = async (gameId: string): Promise<void> => {
    const result = await startRoundService.execute(new StartRoundCommand(gameId))
    io.to(gameId).emit('round:started', {
      roundNumber: result.roundNumber,
      letter: result.letter,
      categories: result.categories,
      closingTimeSeconds: result.closingTimeSeconds,
    })
  }

  // Recover timers for rounds that were in CLOSING state before this process started.
  try {
    const closingRounds = await roundRepository.findClosingWithDeadlineAfter(new Date())
    for (const round of closingRounds) {
      const msUntilDeadline = round.closingDeadline!.getTime() - Date.now()
      const roundId = round.id.value
      const gameId = round.gameId.value
      logger.warn({ roundId, gameId }, 'Timer recovery triggered on startup.')
      const timer = setTimeout(async () => {
        closingTimers.delete(roundId)
        await executeCloseRound(roundId, gameId)
      }, msUntilDeadline)
      closingTimers.set(roundId, timer)
    }
  } catch (err) {
    logger.warn({ err }, 'Timer recovery skipped — database may not be ready yet.')
  }

  io.on('connection', (socket) => {
    registerGameSocketHandler(
      io,
      socket,
      gameRepository,
      startGameService,
      cancelGameService,
      cancelGameAfterTimeoutService,
      gameFacade,
      onGameStarted,
      logger.child({ context: 'game' }),
    )
    registerRoundSocketHandler(
      io,
      socket,
      submitAnswersService,
      closeRoundService,
      scoringFacade,
      closingTimers,
      gameFacade,
      logger.child({ context: 'round' }),
    )
    scoringController.register(socket)
  })
}
