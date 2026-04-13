// === src/bootstrap/http.ts ===

import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import '#/shared/types/FastifyTypes.js'

export async function createHttpServer(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true })

  await app.register(cookie)

  return app
}
