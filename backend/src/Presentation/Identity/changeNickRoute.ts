// === src/Presentation/Identity/changeNickRoute.ts ===

import { z } from 'zod'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import { ChangeNickCommand } from '#/Identity/Application/CommandDto/ChangeNickCommand.js'
import { createAuthMiddleware } from '#/Presentation/Identity/authMiddleware.js'
import type { FastifyInstance } from 'fastify'
import type { ChangeNickService } from '#/Identity/Application/ChangeNickService.js'
import type { JwtService } from '#/Identity/Infrastructure/JwtService.js'

const bodySchema = z.object({
  nick: z.string(),
})

export function changeNickRoute(jwtService: JwtService, changeNickService: ChangeNickService) {
  return function (fastify: FastifyInstance): void {
    fastify.patch(
      '/auth/me/nick',
      { preHandler: createAuthMiddleware(jwtService) },
      async (request, reply) => {
        const parsed = bodySchema.safeParse(request.body)
        if (!parsed.success) {
          return reply
            .status(400)
            .send({ error: parsed.error.issues[0]?.message ?? 'Invalid input.' })
        }

        if (!request.userId) {
          return reply.status(401).send({ error: 'Unauthorized.' })
        }

        try {
          await changeNickService.execute(new ChangeNickCommand(request.userId, parsed.data.nick))
        } catch (error) {
          if (error instanceof InvalidArgumentError) {
            return reply.status(400).send({ error: error.message })
          }
          if (error instanceof NotFoundError) {
            return reply.status(404).send({ error: error.message })
          }
          throw error
        }

        return reply.status(200).send({ nick: parsed.data.nick })
      },
    )
  }
}
