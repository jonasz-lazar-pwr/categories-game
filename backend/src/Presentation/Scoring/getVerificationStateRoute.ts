// === src/Presentation/Scoring/getVerificationStateRoute.ts ===

import type { FastifyInstance } from 'fastify'
import type { IGetVerificationStateQuery } from '#/Scoring/Application/GetVerificationStateQuery.js'

export function getVerificationStateRoute(getVerificationStateQuery: IGetVerificationStateQuery) {
  return function (fastify: FastifyInstance): void {
    fastify.get<{ Params: { verificationId: string } }>(
      '/verifications/:verificationId',
      async (request, reply) => {
        const { verificationId } = request.params
        const view = await getVerificationStateQuery.execute(verificationId)
        if (view === null) {
          return reply.status(404).send({ error: 'Verification not found.' })
        }
        return reply.status(200).send(view)
      },
    )
  }
}
