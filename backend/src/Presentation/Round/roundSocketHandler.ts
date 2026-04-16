// === src/Presentation/Round/roundSocketHandler.ts ===

import { z } from 'zod'
import { SubmitAnswersCommand } from '#/Round/Application/CommandDto/SubmitAnswersCommand.js'
import { CloseRoundCommand } from '#/Round/Application/CommandDto/CloseRoundCommand.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import { isSocketData } from '#/Presentation/shared/socketData.js'
import type { Server, Socket } from 'socket.io'
import type { ISubmitAnswersService } from '#/Round/Application/SubmitAnswersService.js'
import type { ICloseRoundService } from '#/Round/Application/CloseRoundService.js'
import type { IScoringFacade } from '#/Round/Domain/ScoringFacade.js'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'
import type pino from 'pino'

const submitAnswersSchema = z.object({
  roundId: z.string().min(1),
  answers: z.record(z.string(), z.string()),
})

export function registerRoundSocketHandler(
  io: Server,
  socket: Socket,
  submitAnswersService: ISubmitAnswersService,
  closeRoundService: ICloseRoundService,
  scoringFacade: IScoringFacade,
  closingTimers: Map<string, ReturnType<typeof setTimeout>>,
  gameFacade: IGameFacade,
  logger: pino.Logger,
): void {
  async function executeCloseRound(roundId: string, gameId: string): Promise<void> {
    try {
      const result = await closeRoundService.execute(new CloseRoundCommand(roundId))
      logger.info({ roundId, gameId }, 'Round closed.')
      io.to(gameId).emit('round:closed')
      await scoringFacade.startAiProcessing(roundId, gameId, result.letter, result.closedAnswers)
    } catch (error) {
      logger.error({ roundId, gameId, error }, 'Unexpected error closing round.')
    }
  }

  socket.on('round:submit_answers', async (payload: unknown) => {
    const parsed = submitAnswersSchema.safeParse(payload)
    if (!parsed.success) {
      socket.emit('error', { message: 'Invalid payload.' })
      return
    }

    if (!isSocketData(socket.data)) {
      socket.emit('error', { message: 'Not joined to a game room.' })
      return
    }

    const { gameId, playerId } = socket.data
    const { roundId, answers } = parsed.data

    logger.debug({ gameId, playerId, event: 'round:submit_answers' }, 'Incoming socket event.')

    try {
      const gameState = await gameFacade.getGameState(new GameIdVo(gameId))
      const closingTimeSeconds = gameState.scoringConfig.closingTimeSeconds

      const result = await submitAnswersService.execute(
        new SubmitAnswersCommand(roundId, playerId, answers, closingTimeSeconds),
      )

      io.to(gameId).emit('round:player_submitted', { playerId })

      if (result.isFirstSubmit && result.closingDeadline !== undefined) {
        io.to(gameId).emit('round:closing_started', {
          deadline: result.closingDeadline.toISOString(),
        })

        const msUntilDeadline = result.closingDeadline.getTime() - Date.now()
        const timer = setTimeout(async () => {
          closingTimers.delete(roundId)
          await executeCloseRound(roundId, gameId)
        }, msUntilDeadline)

        closingTimers.set(roundId, timer)
      }

      if (result.allSubmitted) {
        const existing = closingTimers.get(roundId)
        if (existing !== undefined) {
          clearTimeout(existing)
          closingTimers.delete(roundId)
          await executeCloseRound(roundId, gameId)
        }
      }
    } catch (error) {
      if (error instanceof InvalidArgumentError || error instanceof NotFoundError) {
        socket.emit('error', { message: error.message })
        return
      }
      logger.error({ gameId, playerId, error }, 'Unexpected error in round:submit_answers.')
      throw error
    }
  })
}
