// === src/Round/Application/__tests__/StartRoundService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StartRoundService } from '#/Round/Application/StartRoundService.js'
import { StartRoundCommand } from '#/Round/Application/CommandDto/StartRoundCommand.js'
import { RoundAggregate } from '#/Round/Domain/RoundAggregate.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IGameFacade, IGameConfigurationDto } from '#/Game/Domain/GameFacade.js'
import type { IRoundRepository } from '#/Round/Domain/RoundRepository.js'

const makeGameFacade = (): IGameFacade => ({
  startRound: vi.fn(),
  updatePlayerScore: vi.fn(),
  updatePlayerScores: vi.fn(),
  finishGame: vi.fn(),
  getGameState: vi.fn(),
})

const makeRoundRepo = (): IRoundRepository => ({
  findById: vi.fn(),
  findByGameId: vi.fn(),
  findClosingWithDeadlineAfter: vi.fn(),
  save: vi.fn(),
})

const makeConfig = (): IGameConfigurationDto => ({
  roundNumber: 1,
  letter: 'A',
  categories: [{ categoryId: 'cat-1', name: 'Country', description: 'A sovereign country' }],
  players: [{ playerId: 'player-1', nick: 'Alice', score: 0, isConnected: true }],
  scoringConfig: {
    uniqueOnlyPoints: 15,
    uniquePoints: 10,
    duplicatePoints: 5,
    closingTimeSeconds: 15,
    verificationTimeoutSeconds: 30,
  },
})

describe('StartRoundService', () => {
  let gameFacade: IGameFacade
  let roundRepo: IRoundRepository
  let service: StartRoundService

  beforeEach(() => {
    gameFacade = makeGameFacade()
    roundRepo = makeRoundRepo()
    service = new StartRoundService(gameFacade, roundRepo)
    vi.mocked(roundRepo.save).mockResolvedValue()
  })

  it('calls gameFacade.startRound with the correct gameId', async () => {
    vi.mocked(gameFacade.startRound).mockResolvedValue(makeConfig())

    await service.execute(new StartRoundCommand('game-id-1'))

    expect(gameFacade.startRound).toHaveBeenCalledOnce()
    expect(vi.mocked(gameFacade.startRound).mock.calls[0]?.[0]?.value).toBe('game-id-1')
  })

  it('saves a RoundAggregate to the repository', async () => {
    vi.mocked(gameFacade.startRound).mockResolvedValue(makeConfig())

    await service.execute(new StartRoundCommand('game-id-1'))

    expect(roundRepo.save).toHaveBeenCalledOnce()
    expect(vi.mocked(roundRepo.save).mock.calls[0]?.[0]).toBeInstanceOf(RoundAggregate)
  })

  it('returns correct letter and roundNumber from config', async () => {
    vi.mocked(gameFacade.startRound).mockResolvedValue(makeConfig())

    const result = await service.execute(new StartRoundCommand('game-id-1'))

    expect(result.letter).toBe('A')
    expect(result.roundNumber).toBe(1)
  })

  it('returns closingTimeSeconds from scoringConfig', async () => {
    vi.mocked(gameFacade.startRound).mockResolvedValue(makeConfig())

    const result = await service.execute(new StartRoundCommand('game-id-1'))

    expect(result.closingTimeSeconds).toBe(15)
  })

  it('returns mapped categories', async () => {
    vi.mocked(gameFacade.startRound).mockResolvedValue(makeConfig())

    const result = await service.execute(new StartRoundCommand('game-id-1'))

    expect(result.categories).toHaveLength(1)
    expect(result.categories[0]?.categoryId).toBe('cat-1')
    expect(result.categories[0]?.name).toBe('Country')
  })

  it('propagates NotFoundError thrown by gameFacade', async () => {
    vi.mocked(gameFacade.startRound).mockRejectedValue(new NotFoundError('Game not found.'))

    await expect(service.execute(new StartRoundCommand('game-id-1'))).rejects.toThrow(NotFoundError)
  })
})
