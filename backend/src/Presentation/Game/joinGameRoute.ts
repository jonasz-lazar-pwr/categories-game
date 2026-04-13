// === src/Presentation/Game/joinGameRoute.ts ===

import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { ConflictError } from '#/shared/errors/ConflictError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import { JoinGameCommand } from '#/Game/Application/CommandDto/JoinGameCommand.js'
import type { FastifyInstance } from 'fastify'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'
import type { JoinGameService } from '#/Game/Application/JoinGameService.js'

const bodySchema = z.object({
  gameCode: z.string(),
  nick: z.string().min(1),
})

export function joinGameRoute(jwtService: IJwtService, joinGameService: JoinGameService) {
  return function (fastify: FastifyInstance): void {
    fastify.post('/games/join', async (request, reply) => {
      const parsed = bodySchema.safeParse(request.body)
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' })
      }

      const { gameCode, nick } = parsed.data
      const userId = extractOptionalUserId(request.headers.authorization, jwtService)
      const newPlayerId = randomUUID()

      try {
        const result = await joinGameService.execute(
          new JoinGameCommand(newPlayerId, gameCode, userId, nick),
        )
        return reply.status(200).send({ gameId: result.gameId, playerId: result.playerId })
      } catch (error) {
        if (error instanceof NotFoundError) {
          return reply.status(404).send({ error: error.message })
        }
        if (error instanceof ConflictError) {
          return reply.status(409).send({ error: error.message })
        }
        if (error instanceof InvalidArgumentError) {
          return reply.status(400).send({ error: error.message })
        }
        throw error
      }
    })
  }
}

function extractOptionalUserId(
  authHeader: string | undefined,
  jwtService: IJwtService,
): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  try {
    return jwtService.verifyAccess(authHeader.slice(7))
  } catch {
    return null
  }
}
