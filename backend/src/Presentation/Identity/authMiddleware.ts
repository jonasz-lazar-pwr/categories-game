// === src/Presentation/Identity/authMiddleware.ts ===

import type { FastifyRequest, FastifyReply } from 'fastify'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

export function createAuthMiddleware(jwtService: IJwtService) {
  return async function authMiddleware(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const authHeader = request.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      await reply.status(401).send({ error: 'Missing or malformed Authorization header.' })
      return
    }

    const token = authHeader.slice(7)
    try {
      request.userId = jwtService.verifyAccess(token)
    } catch (error) {
      if (error instanceof InvalidArgumentError) {
        await reply.status(401).send({ error: error.message })
        return
      }
      throw error
    }
  }
}
