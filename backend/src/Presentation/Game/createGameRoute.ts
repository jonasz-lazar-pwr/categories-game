// === src/Presentation/Game/createGameRoute.ts ===

import { z } from 'zod'
import { randomUUID, randomBytes } from 'node:crypto'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import { createAuthMiddleware } from '#/Presentation/Identity/authMiddleware.js'
import { CreateGameCommand } from '#/Game/Application/CommandDto/CreateGameCommand.js'
import type { FastifyInstance } from 'fastify'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'
import type { CreateGameService } from '#/Game/Application/CreateGameService.js'

const bodySchema = z.object({
  alphabetPreset: z.string(),
  roundCount: z.number().int(),
  categoryIds: z.array(z.string()),
  uniqueOnlyPoints: z.number().int().min(0),
  uniquePoints: z.number().int().min(0),
  duplicatePoints: z.number().int().min(0),
  closingTimeSeconds: z.number().int().min(1),
  verificationTimeoutSeconds: z.number().int().min(1),
  waitingForHostTimeoutSeconds: z.number().int().min(1),
  hostNick: z.string().min(1).max(32),
})

export function createGameRoute(jwtService: IJwtService, createGameService: CreateGameService) {
  return function (fastify: FastifyInstance): void {
    fastify.post(
      '/games',
      { preHandler: createAuthMiddleware(jwtService) },
      async (request, reply) => {
        const parsed = bodySchema.safeParse(request.body)
        if (!parsed.success) {
          return reply
            .status(400)
            .send({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' })
        }

        const {
          alphabetPreset,
          roundCount,
          categoryIds,
          uniqueOnlyPoints,
          uniquePoints,
          duplicatePoints,
          closingTimeSeconds,
          verificationTimeoutSeconds,
          waitingForHostTimeoutSeconds,
          hostNick,
        } = parsed.data

        if (!request.userId) {
          return reply.status(401).send({ error: 'Unauthorized.' })
        }

        const gameId = randomUUID()
        const playerId = randomUUID()
        const code = generateGameCode()

        try {
          const result = await createGameService.execute(
            new CreateGameCommand(
              gameId,
              playerId,
              request.userId,
              hostNick,
              code,
              alphabetPreset,
              roundCount,
              categoryIds,
              uniqueOnlyPoints,
              uniquePoints,
              duplicatePoints,
              closingTimeSeconds,
              verificationTimeoutSeconds,
              waitingForHostTimeoutSeconds,
            ),
          )
          return reply.status(201).send({
            gameId: result.gameId,
            gameCode: result.gameCode,
            playerId: result.playerId,
          })
        } catch (error) {
          if (error instanceof NotFoundError) {
            return reply.status(404).send({ error: error.message })
          }
          if (error instanceof InvalidArgumentError) {
            return reply.status(400).send({ error: error.message })
          }
          throw error
        }
      },
    )
  }
}

function generateGameCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = randomBytes(6)
  return Array.from(bytes)
    .map((b) => {
      const ch = chars[b % chars.length]
      if (ch === undefined) throw new Error('Unreachable: index out of bounds in generateGameCode.')
      return ch
    })
    .join('')
}
