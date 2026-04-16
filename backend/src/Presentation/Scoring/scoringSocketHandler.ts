// === src/Presentation/Scoring/scoringSocketHandler.ts ===

import { z } from 'zod'
import { CastVoteCommand } from '#/Scoring/Application/CommandDto/CastVoteCommand.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import { isSocketData } from '#/Presentation/shared/socketData.js'
import type { Server, Socket } from 'socket.io'
import type { ICastVoteService } from '#/Scoring/Application/CastVoteService.js'
import type { IAdvanceCursorService } from '#/Scoring/Application/AdvanceCursorService.js'
import type {
  IScoringEventEmitter,
  IFirstVerificationItem,
} from '#/Scoring/Application/ScoringEventEmitter.js'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'
import type pino from 'pino'

const castVoteSchema = z.object({
  verificationId: z.string().min(1),
  accepted: z.boolean(),
})

export class ScoringController {
  private readonly verificationTimers = new Map<string, ReturnType<typeof setTimeout>>()

  public readonly eventEmitter: IScoringEventEmitter

  public constructor(
    private readonly io: Server,
    private readonly castVoteService: ICastVoteService,
    private readonly advanceCursorService: IAdvanceCursorService,
    private readonly gameFacade: IGameFacade,
    private readonly logger: pino.Logger,
  ) {
    this.eventEmitter = {
      emitAiProcessingStarted: (
        gameId: string,
        verificationId: string,
        answerCount: number,
      ): void => {
        this.logger.info({ gameId, verificationId, answerCount }, 'AI processing started.')
        io.to(gameId).emit('scoring:ai_processing_started', { verificationId, answerCount })
      },

      emitAiProcessingDone: (
        gameId: string,
        verificationId: string,
        firstItem: IFirstVerificationItem | null,
      ): void => {
        this.logger.info({ gameId, verificationId }, 'AI processing done.')
        io.to(gameId).emit('scoring:ai_processing_done', { verificationId })
        if (firstItem !== null) {
          io.to(gameId).emit('scoring:answer_revealed', {
            playerId: firstItem.playerId,
            categoryId: firstItem.categoryId,
            value: firstItem.value,
            aiScore: firstItem.aiScore,
            aiReasoning: firstItem.aiReasoning,
          })
          this.startTimer(verificationId, gameId)
        }
      },
    }
  }

  public register(socket: Socket): void {
    socket.on('scoring:cast_vote', async (payload: unknown) => {
      const parsed = castVoteSchema.safeParse(payload)
      if (!parsed.success) {
        socket.emit('error', { message: 'Invalid payload.' })
        return
      }

      if (!isSocketData(socket.data)) {
        socket.emit('error', { message: 'Not joined to a game room.' })
        return
      }

      const { gameId, playerId } = socket.data
      const { verificationId, accepted } = parsed.data

      this.logger.debug({ gameId, playerId, event: 'scoring:cast_vote' }, 'Incoming socket event.')

      try {
        const result = await this.castVoteService.execute(
          new CastVoteCommand(verificationId, playerId, accepted),
        )

        this.io.to(gameId).emit('scoring:vote_cast', { voterId: playerId })

        if (result.allEligibleVotesCast) {
          const existing = this.verificationTimers.get(verificationId)
          if (existing !== undefined) {
            clearTimeout(existing)
            this.verificationTimers.delete(verificationId)
          }
          await this.advanceCursor(verificationId, gameId)
        }
      } catch (error) {
        if (error instanceof InvalidArgumentError || error instanceof NotFoundError) {
          socket.emit('error', { message: error.message })
          return
        }
        this.logger.error({ gameId, playerId, error }, 'Unexpected error in scoring:cast_vote.')
        throw error
      }
    })
  }

  // === Private Helpers ===

  private startTimer(verificationId: string, gameId: string): void {
    void this.gameFacade.getGameState(new GameIdVo(gameId)).then((gameState) => {
      const timeoutSeconds = gameState.scoringConfig.verificationTimeoutSeconds
      const timer = setTimeout(async () => {
        this.verificationTimers.delete(verificationId)
        await this.advanceCursor(verificationId, gameId)
      }, timeoutSeconds * 1000)
      this.verificationTimers.set(verificationId, timer)
    })
  }

  private async advanceCursor(verificationId: string, gameId: string): Promise<void> {
    try {
      const result = await this.advanceCursorService.execute({ verificationId })

      this.io.to(gameId).emit('scoring:answer_resolved', {
        playerId: result.resolved.playerId,
        categoryId: result.resolved.categoryId,
        isAccepted: result.resolved.isAccepted,
      })

      if (!result.isFinished && result.nextItem !== null) {
        this.io.to(gameId).emit('scoring:answer_revealed', {
          playerId: result.nextItem.playerId,
          categoryId: result.nextItem.categoryId,
          value: result.nextItem.value,
          aiScore: result.nextItem.aiScore,
          aiReasoning: result.nextItem.aiReasoning,
        })
        this.startTimer(verificationId, gameId)
      }

      if (result.isFinished) {
        this.logger.info({ gameId, verificationId }, 'Verification finished.')
        this.io.to(gameId).emit('scoring:verification_finished', {
          roundScores: result.roundScores ?? {},
        })
        this.logger.info({ gameId }, 'Standings emitted.')
        this.io.to(gameId).emit('scoring:standings', {
          rankings: result.standings ?? [],
        })
      }
    } catch (error) {
      this.logger.error({ gameId, verificationId, error }, 'Unexpected error advancing cursor.')
    }
  }
}
