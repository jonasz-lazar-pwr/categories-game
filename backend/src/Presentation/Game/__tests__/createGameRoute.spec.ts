// === src/Presentation/Game/__tests__/createGameRoute.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { createGameRoute } from '#/Presentation/Game/createGameRoute.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'
import type { CreateGameService } from '#/Game/Application/CreateGameService.js'

const validBody = {
  alphabetPreset: 'EN',
  roundCount: 3,
  categoryIds: ['cat-1'],
  uniqueOnlyPoints: 15,
  uniquePoints: 10,
  duplicatePoints: 5,
  closingTimeSeconds: 15,
  verificationTimeoutSeconds: 30,
  waitingForHostTimeoutSeconds: 60,
  hostNick: 'HostPlayer',
}

const makeServices = () => ({
  jwtService: {
    verifyAccess: vi.fn().mockReturnValue('user-id-1'),
    signAccess: vi.fn(),
    signRefresh: vi.fn(),
    verifyRefresh: vi.fn(),
  } as unknown as IJwtService,
  createGameService: {
    execute: vi
      .fn()
      .mockResolvedValue({ gameId: 'game-id-1', gameCode: 'ABC123', playerId: 'player-id-1' }),
  } as unknown as CreateGameService,
})

describe('createGameRoute', () => {
  let services: ReturnType<typeof makeServices>

  beforeEach(() => {
    services = makeServices()
  })

  const buildApp = (s: ReturnType<typeof makeServices>) => {
    const app = Fastify()
    app.register(createGameRoute(s.jwtService, s.createGameService))
    return app
  }

  it('returns 401 when Authorization header is missing', async () => {
    const app = buildApp(services)
    const response = await app.inject({ method: 'POST', url: '/games', payload: validBody })
    expect(response.statusCode).toBe(401)
  })

  it('returns 400 when body is invalid', async () => {
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/games',
      headers: { authorization: 'Bearer valid-token' },
      payload: { ...validBody, roundCount: 'not-a-number' },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 201 with gameId, gameCode, and playerId on success', async () => {
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/games',
      headers: { authorization: 'Bearer valid-token' },
      payload: validBody,
    })
    expect(response.statusCode).toBe(201)
    const body = JSON.parse(response.body) as { gameId: string; gameCode: string; playerId: string }
    expect(body.gameId).toBe('game-id-1')
    expect(body.gameCode).toBe('ABC123')
    expect(body.playerId).toBe('player-id-1')
  })

  it('returns 404 when CreateGameService throws NotFoundError', async () => {
    vi.mocked(services.createGameService.execute).mockRejectedValue(
      new NotFoundError('Category not found.'),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/games',
      headers: { authorization: 'Bearer valid-token' },
      payload: validBody,
    })
    expect(response.statusCode).toBe(404)
  })

  it('returns 400 when CreateGameService throws InvalidArgumentError', async () => {
    vi.mocked(services.createGameService.execute).mockRejectedValue(
      new InvalidArgumentError('Invalid preset.'),
    )
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/games',
      headers: { authorization: 'Bearer valid-token' },
      payload: validBody,
    })
    expect(response.statusCode).toBe(400)
  })
})
