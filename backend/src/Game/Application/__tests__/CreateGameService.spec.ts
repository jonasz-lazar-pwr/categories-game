// === src/Game/Application/__tests__/CreateGameService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CreateGameService } from '#/Game/Application/CreateGameService.js'
import { CreateGameCommand } from '#/Game/Application/CommandDto/CreateGameCommand.js'
import { CategoryEntity } from '#/Game/Domain/CategoryEntity.js'
import { CategoryIdVo } from '#/Game/Domain/ValueObjects/CategoryIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { ICategoryRepository } from '#/Game/Domain/CategoryRepository.js'

const makeCategoryRepo = (): ICategoryRepository => ({
  findAllDefault: vi.fn(),
  findById: vi.fn(),
  save: vi.fn(),
})

const makeGameRepo = (): IGameRepository => ({
  findById: vi.fn(),
  findByCode: vi.fn(),
  save: vi.fn(),
})

const makeCommand = (): CreateGameCommand =>
  new CreateGameCommand(
    'game-id-1',
    'player-id-1',
    'user-id-1',
    'HostNick',
    'ABC123',
    'EN',
    3,
    ['cat-id-1'],
    15,
    10,
    5,
    15,
    30,
    60,
  )

const makeCategoryEntity = (): CategoryEntity =>
  CategoryEntity.restore(new CategoryIdVo('cat-id-1'), 'Country', 'A sovereign country', true)

describe('CreateGameService', () => {
  let gameRepo: IGameRepository
  let categoryRepo: ICategoryRepository
  let service: CreateGameService

  beforeEach(() => {
    gameRepo = makeGameRepo()
    categoryRepo = makeCategoryRepo()
    service = new CreateGameService(gameRepo, categoryRepo)
    vi.mocked(categoryRepo.findById).mockResolvedValue(makeCategoryEntity())
    vi.mocked(gameRepo.save).mockResolvedValue()
  })

  it('saves the game aggregate and returns correct result', async () => {
    const result = await service.execute(makeCommand())
    expect(vi.mocked(gameRepo.save)).toHaveBeenCalledOnce()
    expect(result.gameId).toBe('game-id-1')
    expect(result.gameCode).toBe('ABC123')
    expect(result.playerId).toBe('player-id-1')
  })

  it('throws NotFoundError when a category is not found', async () => {
    vi.mocked(categoryRepo.findById).mockResolvedValue(null)
    await expect(service.execute(makeCommand())).rejects.toThrow(NotFoundError)
  })

  it('throws InvalidArgumentError when alphabetPreset is unknown', async () => {
    const cmd = new CreateGameCommand(
      'game-id-1',
      'player-id-1',
      'user-id-1',
      'HostNick',
      'ABC123',
      'INVALID_PRESET',
      3,
      ['cat-id-1'],
      15,
      10,
      5,
      15,
      30,
      60,
    )
    await expect(service.execute(cmd)).rejects.toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError when roundCount is out of range', async () => {
    const cmd = new CreateGameCommand(
      'game-id-1',
      'player-id-1',
      'user-id-1',
      'HostNick',
      'ABC123',
      'EN',
      0,
      ['cat-id-1'],
      15,
      10,
      5,
      15,
      30,
      60,
    )
    await expect(service.execute(cmd)).rejects.toThrow(InvalidArgumentError)
  })
})
