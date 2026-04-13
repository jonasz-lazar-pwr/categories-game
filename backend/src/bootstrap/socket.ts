// === src/bootstrap/socket.ts ===

import type { FastifyInstance } from 'fastify'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { IStartGameService } from '#/Game/Application/StartGameService.js'
import type { ICancelGameService } from '#/Game/Application/CancelGameService.js'
import { registerGameSocketHandler } from '#/Presentation/Game/gameSocketHandler.js'

export async function bootstrapSocket(
  app: FastifyInstance,
  gameRepository: IGameRepository,
  startGameService: IStartGameService,
  cancelGameService: ICancelGameService,
): Promise<void> {
  const { Server } = await import('socket.io')
  const io = new Server(app.server, { cors: { origin: '*' } })

  io.on('connection', (socket) => {
    registerGameSocketHandler(io, socket, gameRepository, startGameService, cancelGameService)
  })
}
