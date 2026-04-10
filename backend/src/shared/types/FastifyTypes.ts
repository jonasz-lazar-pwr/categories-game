// === src/shared/types/FastifyTypes.ts ===

import '@fastify/cookie'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string | undefined
  }
}
