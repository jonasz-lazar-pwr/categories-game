// === src/Presentation/Identity/refreshRoute.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import type { FastifyInstance } from 'fastify'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'

export function refreshRoute(jwtService: IJwtService) {
  return function (fastify: FastifyInstance): void {
    fastify.post('/auth/refresh', async (request, reply) => {
      const token = request.cookies['refreshToken']
      if (!token) {
        return reply.status(401).send({ error: 'Refresh token missing.' })
      }

      let userId: string
      try {
        userId = jwtService.verifyRefresh(token)
      } catch (error) {
        if (error instanceof InvalidArgumentError) {
          return reply.status(401).send({ error: error.message })
        }
        throw error
      }

      const accessToken = jwtService.signAccess(userId)
      return reply.status(200).send({ accessToken })
    })
  }
}
