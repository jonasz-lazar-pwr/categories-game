// === src/Presentation/Game/__tests__/getGameRoute.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { getGameRoute } from '#/Presentation/Game/getGameRoute.js'
import { GameLobbyDto } from '#/Game/Application/ReadDto/GameLobbyDto.js'
import { ScoringConfigView } from '#/Game/Application/View/ScoringConfigView.js'
import type { IGetGameQuery } from '#/Game/Application/GetGameQuery.js'

const makeLobbyDto = (): GameLobbyDto =>
  new GameLobbyDto(
    'game-id-1',
    'ABC123',
    'lobby',
    'host-player-id',
    'EN',
    3,
    0,
    [],
    [],
    new ScoringConfigView(15, 10, 5, 15, 30, 60),
  )

describe('getGameRoute', () => {
  let getGameQuery: IGetGameQuery

  beforeEach(() => {
    getGameQuery = { execute: vi.fn() } as unknown as IGetGameQuery
  })

  const buildApp = (q: IGetGameQuery) => {
    const app = Fastify()
    app.register(getGameRoute(q))
    return app
  }

  it('returns 200 with game dto when game exists', async () => {
    vi.mocked(getGameQuery.execute).mockResolvedValue(makeLobbyDto())
    const app = buildApp(getGameQuery)
    const response = await app.inject({ method: 'GET', url: '/games/game-id-1' })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body) as { id: string }
    expect(body.id).toBe('game-id-1')
  })

  it('returns 404 when game does not exist', async () => {
    vi.mocked(getGameQuery.execute).mockResolvedValue(null)
    const app = buildApp(getGameQuery)
    const response = await app.inject({ method: 'GET', url: '/games/unknown-id' })
    expect(response.statusCode).toBe(404)
  })
})
