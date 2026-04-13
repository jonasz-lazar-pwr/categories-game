// === src/Presentation/Game/gameSocketHandler.ts ===

import { z } from 'zod'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { StartGameCommand } from '#/Game/Application/CommandDto/StartGameCommand.js'
import { CancelGameCommand } from '#/Game/Application/CommandDto/CancelGameCommand.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { Server, Socket } from 'socket.io'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { IStartGameService } from '#/Game/Application/StartGameService.js'
import type { ICancelGameService } from '#/Game/Application/CancelGameService.js'

interface SocketData {
  gameId: string
  playerId: string
  isHost: boolean
}

const joinRoomSchema = z.object({
  gameId: z.string(),
  playerId: z.string(),
})

const startSchema = z.object({
  gameId: z.string(),
})

function isSocketData(value: unknown): value is SocketData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'gameId' in value &&
    typeof (value as Record<string, unknown>)['gameId'] === 'string' &&
    'playerId' in value &&
    typeof (value as Record<string, unknown>)['playerId'] === 'string' &&
    'isHost' in value &&
    typeof (value as Record<string, unknown>)['isHost'] === 'boolean'
  )
}

export function registerGameSocketHandler(
  io: Server,
  socket: Socket,
  gameRepository: IGameRepository,
  startGameService: IStartGameService,
  cancelGameService: ICancelGameService,
): void {
  socket.on('game:join_room', async (payload: unknown) => {
    const parsed = joinRoomSchema.safeParse(payload)
    if (!parsed.success) {
      socket.emit('error', { message: 'Invalid payload.' })
      return
    }

    const { gameId, playerId } = parsed.data

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
      throw error
    }
  })

  socket.on('game:start', async (payload: unknown) => {
    const parsed = startSchema.safeParse(payload)
    if (!parsed.success) {
      socket.emit('error', { message: 'Invalid payload.' })
      return
    }

    const { gameId } = parsed.data

    if (!isSocketData(socket.data)) {
      socket.emit('error', { message: 'Not joined to a game room.' })
      return
    }

    const { playerId } = socket.data

    try {
      await startGameService.execute(new StartGameCommand(gameId, playerId))
      io.to(gameId).emit('game:started')
    } catch (error) {
      if (error instanceof InvalidArgumentError || error instanceof NotFoundError) {
        socket.emit('error', { message: error.message })
        return
      }
      throw error
    }
  })

  socket.on('game:cancel_by_player', async () => {
    if (!isSocketData(socket.data)) {
      socket.emit('error', { message: 'Not joined to a game room.' })
      return
    }

    const { gameId, playerId } = socket.data

    try {
      await cancelGameService.execute(new CancelGameCommand(gameId, playerId))
      io.to(gameId).emit('game:cancelled')
    } catch (error) {
      if (error instanceof InvalidArgumentError || error instanceof NotFoundError) {
        socket.emit('error', { message: error.message })
        return
      }
      throw error
    }
  })

  socket.on('disconnect', async () => {
    if (!isSocketData(socket.data)) return

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
      }
    } catch {}
  })
}
