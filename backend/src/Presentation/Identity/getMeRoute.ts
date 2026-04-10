// === src/Presentation/Identity/getMeRoute.ts ===

import type { FastifyInstance } from 'fastify'
import type { GetUserProfileQuery } from '#/Identity/Application/GetUserProfileQuery.js'
import type { JwtService } from '#/Identity/Infrastructure/JwtService.js'
import { createAuthMiddleware } from '#/Presentation/Identity/authMiddleware.js'

export function getMeRoute(jwtService: JwtService, getUserProfileQuery: GetUserProfileQuery) {
  return function (fastify: FastifyInstance): void {
    fastify.get(
      '/auth/me',
      { preHandler: createAuthMiddleware(jwtService) },
      async (request, reply) => {
        if (!request.userId) {
          return reply.status(401).send({ error: 'Unauthorized.' })
        }
        const user = await getUserProfileQuery.execute(request.userId)
        if (user === null) {
          return reply.status(404).send({ error: 'User not found.' })
        }
        return reply.status(200).send(user)
      },
    )
  }
}
