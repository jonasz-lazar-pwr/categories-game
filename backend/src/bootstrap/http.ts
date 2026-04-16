// === src/bootstrap/http.ts ===

import Fastify, { type FastifyInstance } from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import '#/shared/types/FastifyTypes.js'
import type pino from 'pino'

export async function createHttpServer(
  loggerOptions: pino.LoggerOptions,
): Promise<FastifyInstance> {
  const app = Fastify({ logger: loggerOptions })

  await app.register(cookie)

  const allowedOrigins = process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:5173']
  await app.register(cors, { origin: allowedOrigins, credentials: true })

  await app.register(rateLimit, { global: false })

  return app
}
