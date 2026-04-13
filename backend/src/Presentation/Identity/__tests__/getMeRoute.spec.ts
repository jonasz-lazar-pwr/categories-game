// === src/Presentation/Identity/__tests__/getMeRoute.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { getMeRoute } from '#/Presentation/Identity/getMeRoute.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { GetUserProfileDto } from '#/Identity/Application/ReadDto/GetUserProfileDto.js'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'
import type { IGetUserProfileQuery } from '#/Identity/Application/GetUserProfileQuery.js'
import '#/shared/types/FastifyTypes.js'

const makeServices = (): {
  jwtService: IJwtService
  getUserProfileQuery: IGetUserProfileQuery
} => ({
  jwtService: {
    verifyAccess: vi.fn(),
    signAccess: vi.fn(),
    signRefresh: vi.fn(),
    verifyRefresh: vi.fn(),
  } as unknown as IJwtService,
  getUserProfileQuery: { execute: vi.fn() } as unknown as IGetUserProfileQuery,
})

describe('getMeRoute', () => {
  let services: ReturnType<typeof makeServices>

  beforeEach(() => {
    services = makeServices()
  })

  const buildApp = (s: ReturnType<typeof makeServices>): ReturnType<typeof Fastify> => {
    const app = Fastify()
    app.register(getMeRoute(s.jwtService, s.getUserProfileQuery))
    return app
  }

  it('returns 401 when Authorization header is absent', async () => {
    const app = buildApp(services)
    const response = await app.inject({ method: 'GET', url: '/auth/me' })
    expect(response.statusCode).toBe(401)
  })

  it('returns 401 when Authorization header is malformed', async () => {
    const app = buildApp(services)
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Basic sometoken' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    vi.mocked(services.jwtService.verifyAccess).mockImplementation(() => {
      throw new InvalidArgumentError('Access token is invalid or expired.')
    })
    const app = buildApp(services)
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer badtoken' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('returns 404 when user profile is not found', async () => {
    vi.mocked(services.jwtService.verifyAccess).mockReturnValue('user-id')
    vi.mocked(services.getUserProfileQuery.execute).mockResolvedValue(null)
    const app = buildApp(services)
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer validtoken' },
    })
    expect(response.statusCode).toBe(404)
  })

  it('returns 200 with user profile on success', async () => {
    vi.mocked(services.jwtService.verifyAccess).mockReturnValue('user-id')
    vi.mocked(services.getUserProfileQuery.execute).mockResolvedValue(
      new GetUserProfileDto('user-id', 'user@example.com', 'validnick', new Date('2024-01-01')),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer validtoken' },
    })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body) as { email: string }
    expect(body.email).toBe('user@example.com')
  })

  it('returns 401 when userId is not set on request', async () => {
    vi.mocked(services.jwtService.verifyAccess).mockReturnValue(undefined as unknown as string)
    const app = buildApp(services)
    const response = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer validtoken' },
    })
    expect(response.statusCode).toBe(401)
  })
})
