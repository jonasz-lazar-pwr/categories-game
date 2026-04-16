// === src/Presentation/Game/gameSocketHandler.ts ===

import { z } from 'zod'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { StartGameCommand } from '#/Game/Application/CommandDto/StartGameCommand.js'
import { CancelGameCommand } from '#/Game/Application/CommandDto/CancelGameCommand.js'
import { CancelGameAfterTimeoutCommand } from '#/Game/Application/CommandDto/CancelGameAfterTimeoutCommand.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import { isSocketData } from '#/Presentation/shared/socketData.js'
import type { Server, Socket } from 'socket.io'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { IStartGameService } from '#/Game/Application/StartGameService.js'
import type { ICancelGameService } from '#/Game/Application/CancelGameService.js'
import type { ICancelGameAfterTimeoutService } from '#/Game/Application/CancelGameAfterTimeoutService.js'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'
import type pino from 'pino'

const joinRoomSchema = z.object({
  gameId: z.string(),
  playerId: z.string(),
})

export function registerGameSocketHandler(
  io: Server,
  socket: Socket,
  gameRepository: IGameRepository,
  startGameService: IStartGameService,
  cancelGameService: ICancelGameService,
  cancelGameAfterTimeoutService: ICancelGameAfterTimeoutService,
  gameFacade: IGameFacade,
  onGameStarted: (gameId: string) => Promise<void>,
  logger: pino.Logger,
): void {
  socket.on('game:join_room', async (payload: unknown) => {
    const parsed = joinRoomSchema.safeParse(payload)
    if (!parsed.success) {
      socket.emit('error', { message: 'Invalid payload.' })
      return
    }

    const { gameId, playerId } = parsed.data

    logger.debug({ gameId, playerId, event: 'game:join_room' }, 'Incoming socket event.')

    try {
      const game = await gameRepository.findById(new GameIdVo(gameId))
      if (game === null) {
        socket.emit('error', { message: 'Game not found.' })
        return
      }

      const player = game.players.find((p) => p.playerId.value === playerId)
      if (player === undefined) {
        socket.emit('error', { message: 'Player not found in game.' })
        return
      }

      const wasFirstJoin = player.socketId === null
      const isHost = player.isHost

      game.setPlayerConnected(new PlayerIdVo(playerId), socket.id, true)
      await gameRepository.save(game)

      await socket.join(gameId)
      socket.data = { gameId, playerId, isHost }

      if (wasFirstJoin) {
        io.to(gameId).emit('game:player_joined', { playerId, nick: player.nick, isHost })
      } else if (isHost) {
        io.to(gameId).emit('game:host_reconnected')
      } else {
        io.to(gameId).emit('game:player_reconnected', { playerId })
      }
    } catch (error) {
      if (error instanceof InvalidArgumentError || error instanceof NotFoundError) {
        socket.emit('error', { message: error.message })
        return
      }
      logger.error({ gameId, playerId, error }, 'Unexpected error in game:join_room.')
      throw error
    }
  })

  socket.on('game:start', async () => {
    if (!isSocketData(socket.data)) {
      socket.emit('error', { message: 'Not joined to a game room.' })
      return
    }

    const { gameId, playerId } = socket.data

    logger.debug({ gameId, playerId, event: 'game:start' }, 'Incoming socket event.')

    try {
      await startGameService.execute(new StartGameCommand(gameId, playerId))
      logger.info({ gameId }, 'Game started.')
      io.to(gameId).emit('game:started')
      await onGameStarted(gameId)
    } catch (error) {
      if (error instanceof InvalidArgumentError || error instanceof NotFoundError) {
        socket.emit('error', { message: error.message })
        return
      }
      logger.error({ gameId, playerId, error }, 'Unexpected error in game:start.')
      throw error
    }
  })

  socket.on('game:cancel_by_player', async () => {
    if (!isSocketData(socket.data)) {
      socket.emit('error', { message: 'Not joined to a game room.' })
      return
    }

    const { gameId, playerId } = socket.data

    logger.debug({ gameId, playerId, event: 'game:cancel_by_player' }, 'Incoming socket event.')

    try {
      await cancelGameService.execute(new CancelGameCommand(gameId, playerId))
      logger.info({ gameId }, 'Game cancelled.')
      io.to(gameId).emit('game:cancelled')
    } catch (error) {
      if (error instanceof InvalidArgumentError || error instanceof NotFoundError) {
        socket.emit('error', { message: error.message })
        return
      }
      logger.error({ gameId, playerId, error }, 'Unexpected error in game:cancel_by_player.')
      throw error
    }
  })

  socket.on('game:cancel_after_timeout', async () => {
    if (!isSocketData(socket.data)) {
      socket.emit('error', { message: 'Not joined to a game room.' })
      return
    }

    const { gameId, playerId } = socket.data

    logger.debug({ gameId, playerId, event: 'game:cancel_after_timeout' }, 'Incoming socket event.')

    try {
      await cancelGameAfterTimeoutService.execute(
        new CancelGameAfterTimeoutCommand(gameId, playerId),
      )
      logger.info({ gameId }, 'Game cancelled.')
      io.to(gameId).emit('game:cancelled')
    } catch (error) {
      if (error instanceof InvalidArgumentError || error instanceof NotFoundError) {
        socket.emit('error', { message: error.message })
        return
      }
      logger.error({ gameId, playerId, error }, 'Unexpected error in game:cancel_after_timeout.')
      throw error
    }
  })

  socket.on('game:next_round', async () => {
    if (!isSocketData(socket.data)) {
      socket.emit('error', { message: 'Not joined to a game room.' })
      return
    }

    const { gameId, playerId, isHost } = socket.data

    logger.debug({ gameId, playerId, event: 'game:next_round' }, 'Incoming socket event.')

    if (!isHost) {
      socket.emit('error', { message: 'Only the host can start the next round.' })
      return
    }

    try {
      const game = await gameRepository.findById(new GameIdVo(gameId))
      if (game === null) {
        socket.emit('error', { message: 'Game not found.' })
        return
      }

      if (game.hostId.value !== playerId) {
        socket.emit('error', { message: 'Only the host can start the next round.' })
        return
      }

      await onGameStarted(gameId)
    } catch (error) {
      if (error instanceof InvalidArgumentError || error instanceof NotFoundError) {
        socket.emit('error', { message: error.message })
        return
      }
      logger.error({ gameId, playerId, error }, 'Unexpected error in game:next_round.')
      throw error
    }
  })

  socket.on('game:end', async () => {
    if (!isSocketData(socket.data)) {
      socket.emit('error', { message: 'Not joined to a game room.' })
      return
    }

    const { gameId, playerId, isHost } = socket.data

    logger.debug({ gameId, playerId, event: 'game:end' }, 'Incoming socket event.')

    if (!isHost) {
      socket.emit('error', { message: 'Only the host can end the game.' })
      return
    }

    try {
      const game = await gameRepository.findById(new GameIdVo(gameId))
      if (game === null) {
        socket.emit('error', { message: 'Game not found.' })
        return
      }

      if (game.hostId.value !== playerId) {
        socket.emit('error', { message: 'Only the host can end the game.' })
        return
      }

      await gameFacade.finishGame(new GameIdVo(gameId))
      io.to(gameId).emit('game:finished')
    } catch (error) {
      if (error instanceof InvalidArgumentError || error instanceof NotFoundError) {
        socket.emit('error', { message: error.message })
        return
      }
      logger.error({ gameId, playerId, error }, 'Unexpected error in game:end.')
      throw error
    }
  })

  socket.on('disconnect', async () => {
    if (!isSocketData(socket.data)) {
      logger.warn({ socketId: socket.id }, 'disconnect: socket.data missing or incomplete.')
      return
    }

    const { gameId, playerId, isHost } = socket.data

    try {
      const game = await gameRepository.findById(new GameIdVo(gameId))
      if (game === null) return

      game.setPlayerConnected(new PlayerIdVo(playerId), null, false)
      await gameRepository.save(game)

      if (isHost) {
        io.to(gameId).emit('game:host_disconnected', {
          timeoutSeconds: game.scoringConfig.waitingForHostTimeoutSeconds,
        })
      } else {
        io.to(gameId).emit('game:player_disconnected', { playerId })

        const connectedNonHostCount = game.players.filter((p) => p.isConnected && !p.isHost).length

        if (connectedNonHostCount === 0) {
          game.cancel()
          await gameRepository.save(game)
          io.to(gameId).emit('game:cancelled')
        }
      }
    } catch {}
  })
}
