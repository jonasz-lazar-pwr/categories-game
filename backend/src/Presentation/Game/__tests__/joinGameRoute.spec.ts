// === src/Presentation/Game/__tests__/joinGameRoute.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { joinGameRoute } from '#/Presentation/Game/joinGameRoute.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { ConflictError } from '#/shared/errors/ConflictError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IJwtService } from '#/Identity/Domain/IJwtService.js'
import type { JoinGameService } from '#/Game/Application/JoinGameService.js'

const validBody = { gameCode: 'ABC123', nick: 'Alice' }

const makeServices = () => ({
  jwtService: {
    verifyAccess: vi.fn().mockReturnValue('user-id-1'),
    signAccess: vi.fn(),
    signRefresh: vi.fn(),
    verifyRefresh: vi.fn(),
  } as unknown as IJwtService,
  joinGameService: {
    execute: vi.fn().mockResolvedValue({ gameId: 'game-id-1', playerId: 'player-id-2' }),
  } as unknown as JoinGameService,
})

describe('joinGameRoute', () => {
  let services: ReturnType<typeof makeServices>

  beforeEach(() => {
    services = makeServices()
  })

  const buildApp = (s: ReturnType<typeof makeServices>) => {
    const app = Fastify()
    app.register(joinGameRoute(s.jwtService, s.joinGameService))
    return app
  }

  it('returns 200 with gameId and playerId on guest join', async () => {
    const app = buildApp(services)
    const response = await app.inject({ method: 'POST', url: '/games/join', payload: validBody })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body) as { gameId: string; playerId: string }
    expect(body.gameId).toBe('game-id-1')
    expect(body.playerId).toBe('player-id-2')
  })

  it('returns 200 on authenticated join', async () => {
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/games/join',
      headers: { authorization: 'Bearer valid-token' },
      payload: validBody,
    })
    expect(response.statusCode).toBe(200)
  })

  it('returns 400 when body is invalid', async () => {
    const app = buildApp(services)
    const response = await app.inject({
      method: 'POST',
      url: '/games/join',
      payload: { nick: 'Alice' }, // missing required gameCode
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when JoinGameService throws NotFoundError', async () => {
    vi.mocked(services.joinGameService.execute).mockRejectedValue(
      new NotFoundError('Game not found.'),
    )
    const app = buildApp(services)
    const response = await app.inject({ method: 'POST', url: '/games/join', payload: validBody })
    expect(response.statusCode).toBe(404)
  })

  it('returns 409 when JoinGameService throws ConflictError (nick taken)', async () => {
    vi.mocked(services.joinGameService.execute).mockRejectedValue(
      new ConflictError('Nickname is already taken in this game.'),
    )
    const app = buildApp(services)
    const response = await app.inject({ method: 'POST', url: '/games/join', payload: validBody })
    expect(response.statusCode).toBe(409)
  })

  it('returns 400 when JoinGameService throws InvalidArgumentError', async () => {
    vi.mocked(services.joinGameService.execute).mockRejectedValue(
      new InvalidArgumentError('Invalid game code.'),
    )
    const app = buildApp(services)
    const response = await app.inject({ method: 'POST', url: '/games/join', payload: validBody })
    expect(response.statusCode).toBe(400)
  })
})
