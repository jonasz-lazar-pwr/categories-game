// === src/Presentation/Identity/__tests__/loginRoute.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { loginRoute } from '#/Presentation/Identity/loginRoute.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import type { LoginUserService } from '#/Identity/Application/LoginUserService.js'
import type { JwtService } from '#/Identity/Infrastructure/JwtService.js'
import type { GetUserProfileQuery } from '#/Identity/Application/GetUserProfileQuery.js'
import { GetUserProfileDto } from '#/Identity/Application/ReadDto/GetUserProfileDto.js'

const makeServices = (): {
  loginUserService: LoginUserService
  jwtService: JwtService
  getUserProfileQuery: GetUserProfileQuery
} => ({
  loginUserService: { execute: vi.fn() } as unknown as LoginUserService,
  jwtService: {
    signAccess: vi.fn().mockReturnValue('access-token'),
    signRefresh: vi.fn().mockReturnValue('refresh-token'),
    verifyAccess: vi.fn(),
    verifyRefresh: vi.fn(),
  } as unknown as JwtService,
  getUserProfileQuery: { execute: vi.fn() } as unknown as GetUserProfileQuery,
})

describe('loginRoute', () => {
  let services: ReturnType<typeof makeServices>

  beforeEach(() => {
    services = makeServices()
  })

  const buildApp = (s: ReturnType<typeof makeServices>): ReturnType<typeof Fastify> => {
    const app = Fastify()
    void app.register(cookie)
    app.register(loginRoute(s.loginUserService, s.jwtService, s.getUserProfileQuery))
    return app
  }

  it('returns 400 when email is missing', async () => {
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { password: 'password123' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'user@example.com' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 401 when LoginUserService throws InvalidArgumentError', async () => {
    vi.mocked(services.loginUserService.execute).mockRejectedValue(
      new InvalidArgumentError('Invalid credentials.'),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'user@example.com', password: 'wrongpass' },
    })
    expect(response.statusCode).toBe(401)
  })

  it('returns 200 with accessToken and user on success', async () => {
    vi.mocked(services.loginUserService.execute).mockResolvedValue({ userId: 'user-id' })
    vi.mocked(services.getUserProfileQuery.execute).mockResolvedValue(
      new GetUserProfileDto('user-id', 'user@example.com', 'validnick', new Date()),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'user@example.com', password: 'password123' },
    })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body) as { accessToken: string }
    expect(body.accessToken).toBe('access-token')
  })

  it('returns 500 when getUserProfileQuery returns null', async () => {
    vi.mocked(services.loginUserService.execute).mockResolvedValue({ userId: 'user-id' })
    vi.mocked(services.getUserProfileQuery.execute).mockResolvedValue(null)
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'user@example.com', password: 'password123' },
    })
    expect(response.statusCode).toBe(500)
  })

  it('sets refreshToken HttpOnly cookie on success', async () => {
    vi.mocked(services.loginUserService.execute).mockResolvedValue({ userId: 'user-id' })
    vi.mocked(services.getUserProfileQuery.execute).mockResolvedValue(
      new GetUserProfileDto('user-id', 'user@example.com', 'validnick', new Date()),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'user@example.com', password: 'password123' },
    })
    const setCookie = response.headers['set-cookie']
    expect(setCookie).toBeDefined()
    expect(String(setCookie)).toContain('refreshToken=')
    expect(String(setCookie)).toContain('HttpOnly')
  })
})
