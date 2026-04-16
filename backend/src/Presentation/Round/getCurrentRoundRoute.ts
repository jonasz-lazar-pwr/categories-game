// === src/Presentation/Round/getCurrentRoundRoute.ts ===

import type { FastifyInstance } from 'fastify'
import type { IGetCurrentRoundQuery } from '#/Round/Application/GetCurrentRoundQuery.js'

export function getCurrentRoundRoute(getCurrentRoundQuery: IGetCurrentRoundQuery) {
  return function (fastify: FastifyInstance): void {
    fastify.get<{ Params: { gameId: string } }>(
      '/games/:gameId/round/current',
      async (request, reply) => {
        const { gameId } = request.params
        const view = await getCurrentRoundQuery.execute(gameId)
        if (view === null) {
          return reply.status(404).send({ error: 'No active round found.' })
        }
        return reply.status(200).send(view)
      },
    )
  }
}
