// === src/Presentation/Identity/logoutRoute.ts ===

import type { FastifyInstance } from 'fastify'

export function logoutRoute() {
  return function (fastify: FastifyInstance): void {
    fastify.post('/auth/logout', async (_request, reply) => {
      void reply.clearCookie('refreshToken', { path: '/auth' })
      return reply.status(204).send()
    })
  }
}
