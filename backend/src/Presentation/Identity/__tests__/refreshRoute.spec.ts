// === src/Presentation/Identity/__tests__/refreshRoute.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { refreshRoute } from '#/Presentation/Identity/refreshRoute.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import type { JwtService } from '#/Identity/Infrastructure/JwtService.js'

const makeJwtService = (): JwtService =>
  ({
    signAccess: vi.fn().mockReturnValue('new-access-token'),
    signRefresh: vi.fn(),
    verifyAccess: vi.fn(),
    verifyRefresh: vi.fn(),
  }) as unknown as JwtService

describe('refreshRoute', () => {
  let jwtService: JwtService

  beforeEach(() => {
    jwtService = makeJwtService()
  })

  const buildApp = (j: JwtService): ReturnType<typeof Fastify> => {
    const app = Fastify()
    void app.register(cookie)
    app.register(refreshRoute(j))
    return app
  }

  it('returns 401 when refreshToken cookie is absent', async () => {
    const app = buildApp(jwtService)
    const response = await app.inject({ method: 'POST', url: '/auth/refresh' })
    expect(response.statusCode).toBe(401)
  })

  it('returns 401 when verifyRefresh throws InvalidArgumentError', async () => {
    vi.mocked(jwtService.verifyRefresh).mockImplementation(() => {
      throw new InvalidArgumentError('Refresh token is invalid or expired.')
    })
    const app = buildApp(jwtService)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refreshToken: 'badtoken' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('returns 200 with new accessToken on success', async () => {
    vi.mocked(jwtService.verifyRefresh).mockReturnValue('user-id')
    const app = buildApp(jwtService)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      cookies: { refreshToken: 'valid-refresh-token' },
    })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body) as { accessToken: string }
    expect(body.accessToken).toBe('new-access-token')
  })
})
