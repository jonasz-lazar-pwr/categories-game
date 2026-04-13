// === src/Game/Application/__tests__/StartGameService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StartGameService } from '#/Game/Application/StartGameService.js'
import { StartGameCommand } from '#/Game/Application/CommandDto/StartGameCommand.js'
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

describe('StartGameService', () => {
  let gameRepo: IGameRepository
  let service: StartGameService

  beforeEach(() => {
    gameRepo = makeGameRepo()
    service = new StartGameService(gameRepo)
    vi.mocked(gameRepo.save).mockResolvedValue()
  })

  it('transitions game to active status', async () => {
    const game = makeGame()
    vi.mocked(gameRepo.findById).mockResolvedValue(game)

    await service.execute(new StartGameCommand('game-id-1', 'host-player-id'))

    expect(game.status).toBe(GameStatus.active)
    expect(vi.mocked(gameRepo.save)).toHaveBeenCalledOnce()
  })

  it('throws InvalidArgumentError when requester is not the host', async () => {
    vi.mocked(gameRepo.findById).mockResolvedValue(makeGame())

    await expect(
      service.execute(new StartGameCommand('game-id-1', 'not-the-host')),
    ).rejects.toThrow(InvalidArgumentError)
  })

  it('throws NotFoundError when game does not exist', async () => {
    vi.mocked(gameRepo.findById).mockResolvedValue(null)

    await expect(
      service.execute(new StartGameCommand('game-id-1', 'host-player-id')),
    ).rejects.toThrow(NotFoundError)
  })
})
