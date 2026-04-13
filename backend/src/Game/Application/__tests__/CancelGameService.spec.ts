// === src/Game/Application/__tests__/CancelGameService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CancelGameService } from '#/Game/Application/CancelGameService.js'
import { CancelGameCommand } from '#/Game/Application/CommandDto/CancelGameCommand.js'
import { GameAggregate } from '#/Game/Domain/GameAggregate.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { GameCodeVo } from '#/Game/Domain/ValueObjects/GameCodeVo.js'
import { GameStatus } from '#/Game/Domain/ValueObjects/GameStatusVo.js'
import { RoundCountVo } from '#/Game/Domain/ValueObjects/RoundCountVo.js'
import { AlphabetPreset } from '#/Game/Domain/ValueObjects/AlphabetPresetVo.js'
import { CategoryConfig } from '#/Game/Domain/Entities/CategoryConfig.js'
import { ScoringConfig } from '#/Game/Domain/Entities/ScoringConfig.js'
import { CategoryIdVo } from '#/Game/Domain/ValueObjects/CategoryIdVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'

const makeGameRepo = (): IGameRepository => ({
  findById: vi.fn(),
  findByCode: vi.fn(),
  save: vi.fn(),
})

const makeGame = (): GameAggregate =>
  GameAggregate.create(
    new GameIdVo('game-id-1'),
    new GameCodeVo('ABC123'),
    new PlayerIdVo('host-player-id'),
    new UserIdVo('host-user-id'),
    'Host',
    {
      alphabetPreset: AlphabetPreset.EN,
      roundCount: new RoundCountVo(3),
      categories: [new CategoryConfig(new CategoryIdVo('cat-1'), 'Country', 'A sovereign country')],
      scoringConfig: new ScoringConfig(15, 10, 5, 15, 30, 60),
    },
  )

describe('CancelGameService', () => {
  let gameRepo: IGameRepository
  let service: CancelGameService

  beforeEach(() => {
    gameRepo = makeGameRepo()
    service = new CancelGameService(gameRepo)
    vi.mocked(gameRepo.save).mockResolvedValue()
  })

  it('cancels a game in lobby status', async () => {
    const game = makeGame()
    vi.mocked(gameRepo.findById).mockResolvedValue(game)

    await service.execute(new CancelGameCommand('game-id-1', 'host-player-id'))

    expect(game.status).toBe(GameStatus.cancelled)
    expect(vi.mocked(gameRepo.save)).toHaveBeenCalledOnce()
  })

  it('cancels a game in active status', async () => {
    const game = makeGame()
    game.start()
    vi.mocked(gameRepo.findById).mockResolvedValue(game)

    await service.execute(new CancelGameCommand('game-id-1', 'host-player-id'))

    expect(game.status).toBe(GameStatus.cancelled)
  })

  it('throws NotFoundError when game does not exist', async () => {
    vi.mocked(gameRepo.findById).mockResolvedValue(null)

    await expect(
      service.execute(new CancelGameCommand('game-id-1', 'host-player-id')),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws InvalidArgumentError when requester is not the host', async () => {
    vi.mocked(gameRepo.findById).mockResolvedValue(makeGame())

    await expect(
      service.execute(new CancelGameCommand('game-id-1', 'not-the-host')),
    ).rejects.toThrow(InvalidArgumentError)
  })
})
