// === src/Presentation/Identity/__tests__/changeNickRoute.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { changeNickRoute } from '#/Presentation/Identity/changeNickRoute.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { JwtService } from '#/Identity/Infrastructure/JwtService.js'
import type { ChangeNickService } from '#/Identity/Application/ChangeNickService.js'
import '#/shared/types/FastifyTypes.js'

const makeServices = (): { jwtService: JwtService; changeNickService: ChangeNickService } => ({
  jwtService: {
    verifyAccess: vi.fn().mockReturnValue('user-id'),
    signAccess: vi.fn(),
    signRefresh: vi.fn(),
    verifyRefresh: vi.fn(),
  } as unknown as JwtService,
  changeNickService: { execute: vi.fn() } as unknown as ChangeNickService,
})

describe('changeNickRoute', () => {
  let services: ReturnType<typeof makeServices>

  beforeEach(() => {
    services = makeServices()
  })

  const buildApp = (s: ReturnType<typeof makeServices>): ReturnType<typeof Fastify> => {
    const app = Fastify()
    app.register(changeNickRoute(s.jwtService, s.changeNickService))
    return app
  }

  it('returns 401 when Authorization header is absent', async () => {
    vi.mocked(services.jwtService.verifyAccess).mockImplementation(() => {
      throw new InvalidArgumentError('Missing header.')
    })
    const app = buildApp(services)
    const response = await app.inject({ method: 'PATCH', url: '/auth/me/nick' })
    expect(response.statusCode).toBe(401)
  })

  it('returns 400 when nick is missing from body', async () => {
    const app = buildApp(services)
    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/me/nick',
      headers: { authorization: 'Bearer validtoken' },
      payload: {},
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 400 when ChangeNickService throws InvalidArgumentError', async () => {
    vi.mocked(services.changeNickService.execute).mockRejectedValue(
      new InvalidArgumentError('Nick is too short.'),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/me/nick',
      headers: { authorization: 'Bearer validtoken' },
      payload: { nick: 'ab' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when ChangeNickService throws NotFoundError', async () => {
    vi.mocked(services.changeNickService.execute).mockRejectedValue(
      new NotFoundError('User not found.'),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/me/nick',
      headers: { authorization: 'Bearer validtoken' },
      payload: { nick: 'validnick' },
    })
    expect(response.statusCode).toBe(404)
  })

  it('returns 200 with nick on success', async () => {
    vi.mocked(services.changeNickService.execute).mockResolvedValue(undefined)
    const app = buildApp(services)
    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/me/nick',
      headers: { authorization: 'Bearer validtoken' },
      payload: { nick: 'newnick' },
    })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body) as { nick: string }
    expect(body.nick).toBe('newnick')
  })

  it('returns 401 when userId is not set on request', async () => {
    vi.mocked(services.jwtService.verifyAccess).mockReturnValue(undefined as unknown as string)
    const app = buildApp(services)
    const response = await app.inject({
      method: 'PATCH',
      url: '/auth/me/nick',
      headers: { authorization: 'Bearer validtoken' },
      payload: { nick: 'newnick' },
    })
    expect(response.statusCode).toBe(401)
  })
})
