// === src/Presentation/Game/getGameRoute.ts ===

import type { FastifyInstance } from 'fastify'
import type { IGetGameQuery } from '#/Game/Application/GetGameQuery.js'

export function getGameRoute(getGameQuery: IGetGameQuery) {
  return function (fastify: FastifyInstance): void {
    fastify.get<{ Params: { gameId: string } }>('/games/:gameId', async (request, reply) => {
      const { gameId } = request.params
      const dto = await getGameQuery.execute(gameId)
      if (dto === null) {
        return reply.status(404).send({ error: 'Game not found.' })
      }
      return reply.status(200).send(dto)
    })
  }
}
