// === src/Presentation/Identity/__tests__/authMiddleware.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { createAuthMiddleware } from '#/Presentation/Identity/authMiddleware.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import type { JwtService } from '#/Identity/Infrastructure/JwtService.js'
import '#/shared/types/FastifyTypes.js'

const makeJwtService = (): JwtService =>
  ({
    verifyAccess: vi.fn(),
    signAccess: vi.fn(),
    signRefresh: vi.fn(),
    verifyRefresh: vi.fn(),
  }) as unknown as JwtService

describe('authMiddleware', () => {
  let jwtService: JwtService

  beforeEach(() => {
    jwtService = makeJwtService()
  })

  const buildApp = (): ReturnType<typeof Fastify> => {
    const app = Fastify()
    app.get('/protected', { preHandler: createAuthMiddleware(jwtService) }, (request, reply) => {
      return reply.send({ userId: request.userId })
    })
    return app
  }

  it('returns 401 when Authorization header is missing', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/protected' })
    expect(response.statusCode).toBe(401)
  })

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Basic sometoken' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('returns 401 when verifyAccess throws InvalidArgumentError', async () => {
    vi.mocked(jwtService.verifyAccess).mockImplementation(() => {
      throw new InvalidArgumentError('Access token is invalid or expired.')
    })
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer badtoken' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('sets request.userId and calls next on valid token', async () => {
    vi.mocked(jwtService.verifyAccess).mockReturnValue('user-uuid-123')
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer validtoken' },
    })
    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ userId: 'user-uuid-123' })
  })
})
