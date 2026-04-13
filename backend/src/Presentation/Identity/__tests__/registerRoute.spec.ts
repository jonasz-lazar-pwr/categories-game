// === src/Presentation/Identity/__tests__/registerRoute.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import { registerRoute } from '#/Presentation/Identity/registerRoute.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { ConflictError } from '#/shared/errors/ConflictError.js'
import type { RegisterUserService } from '#/Identity/Application/RegisterUserService.js'
import type { PasswordService } from '#/Identity/Infrastructure/PasswordService.js'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'
import type { IGetUserProfileQuery } from '#/Identity/Application/GetUserProfileQuery.js'
import { GetUserProfileDto } from '#/Identity/Application/ReadDto/GetUserProfileDto.js'

const validBody = { email: 'user@example.com', nick: 'validnick', password: 'password123' }

const makeServices = (): {
  registerUserService: RegisterUserService
  passwordService: PasswordService
  jwtService: IJwtService
  getUserProfileQuery: IGetUserProfileQuery
} => ({
  registerUserService: { execute: vi.fn() } as unknown as RegisterUserService,
  passwordService: { hash: vi.fn(), verify: vi.fn() } as unknown as PasswordService,
  jwtService: {
    signAccess: vi.fn().mockReturnValue('access-token'),
    signRefresh: vi.fn().mockReturnValue('refresh-token'),
    verifyAccess: vi.fn(),
    verifyRefresh: vi.fn(),
  } as unknown as IJwtService,
  getUserProfileQuery: { execute: vi.fn() } as unknown as IGetUserProfileQuery,
})

describe('registerRoute', () => {
  let services: ReturnType<typeof makeServices>

  beforeEach(() => {
    services = makeServices()
  })

  const buildApp = (s: ReturnType<typeof makeServices>): ReturnType<typeof Fastify> => {
    const app = Fastify()
    void app.register(cookie)
    app.register(
      registerRoute(s.registerUserService, s.passwordService, s.jwtService, s.getUserProfileQuery),
    )
    return app
  }

  it('returns 400 when email is missing', async () => {
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { nick: 'validnick', password: 'password123' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when nick is missing', async () => {
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'user@example.com', password: 'password123' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when password is shorter than 8 characters', async () => {
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'user@example.com', nick: 'validnick', password: 'short' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 409 when RegisterUserService throws ConflictError', async () => {
    vi.mocked(services.passwordService.hash).mockResolvedValue('$2b$12$hash')
    vi.mocked(services.registerUserService.execute).mockRejectedValue(
      new ConflictError('Email is already taken.'),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validBody,
    })
    expect(response.statusCode).toBe(409)
  })

  it('returns 400 when RegisterUserService throws InvalidArgumentError', async () => {
    vi.mocked(services.passwordService.hash).mockResolvedValue('$2b$12$hash')
    vi.mocked(services.registerUserService.execute).mockRejectedValue(
      new InvalidArgumentError('Nick is too short.'),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validBody,
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 500 when getUserProfileQuery returns null', async () => {
    vi.mocked(services.passwordService.hash).mockResolvedValue('$2b$12$hash')
    vi.mocked(services.registerUserService.execute).mockResolvedValue(undefined)
    vi.mocked(services.getUserProfileQuery.execute).mockResolvedValue(null)
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validBody,
    })
    expect(response.statusCode).toBe(500)
  })

  it('returns 201 with accessToken and user on success', async () => {
    vi.mocked(services.passwordService.hash).mockResolvedValue('$2b$12$hash')
    vi.mocked(services.registerUserService.execute).mockResolvedValue(undefined)
    vi.mocked(services.getUserProfileQuery.execute).mockResolvedValue(
      new GetUserProfileDto('user-id', 'user@example.com', 'validnick', new Date()),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validBody,
    })
    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body) as { accessToken: string }
    expect(body.accessToken).toBe('access-token')
  })

  it('sets refreshToken HttpOnly cookie on success', async () => {
    vi.mocked(services.passwordService.hash).mockResolvedValue('$2b$12$hash')
    vi.mocked(services.registerUserService.execute).mockResolvedValue(undefined)
    vi.mocked(services.getUserProfileQuery.execute).mockResolvedValue(
      new GetUserProfileDto('user-id', 'user@example.com', 'validnick', new Date()),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: validBody,
    })
    const setCookie = response.headers['set-cookie']
    expect(setCookie).toBeDefined()
    expect(String(setCookie)).toContain('refreshToken=')
    expect(String(setCookie)).toContain('HttpOnly')
  })

  it('calls PasswordService.hash before RegisterUserService.execute', async () => {
    const callOrder: string[] = []
    vi.mocked(services.passwordService.hash).mockImplementation(() => {
      callOrder.push('hash')
      return Promise.resolve('$2b$12$hash')
    })
    vi.mocked(services.registerUserService.execute).mockImplementation(() => {
      callOrder.push('execute')
      return Promise.resolve(undefined)
    })
    vi.mocked(services.getUserProfileQuery.execute).mockResolvedValue(
      new GetUserProfileDto('user-id', 'user@example.com', 'validnick', new Date()),
    )
    const app = buildApp(services)
    await app.inject({ method: 'POST', url: '/auth/register', payload: validBody })
    expect(callOrder).toEqual(['hash', 'execute'])
  })
})
