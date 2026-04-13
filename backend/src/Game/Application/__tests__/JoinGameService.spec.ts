// === src/Game/Application/__tests__/JoinGameService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { JoinGameService } from '#/Game/Application/JoinGameService.js'
import { JoinGameCommand } from '#/Game/Application/CommandDto/JoinGameCommand.js'
import { GameAggregate } from '#/Game/Domain/GameAggregate.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { GameCodeVo } from '#/Game/Domain/ValueObjects/GameCodeVo.js'
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

const makeLobbyGame = (): GameAggregate =>
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

describe('JoinGameService', () => {
  let gameRepo: IGameRepository
  let service: JoinGameService

  beforeEach(() => {
    gameRepo = makeGameRepo()
    service = new JoinGameService(gameRepo)
    vi.mocked(gameRepo.save).mockResolvedValue()
  })

  describe('lobby join', () => {
    it('adds the player and returns gameId and new playerId', async () => {
      const game = makeLobbyGame()
      vi.mocked(gameRepo.findByCode).mockResolvedValue(game)

      const result = await service.execute(
        new JoinGameCommand('new-player-id', 'ABC123', null, 'Alice'),
      )

      expect(result.playerId).toBe('new-player-id')
      expect(result.gameId).toBe('game-id-1')
      expect(vi.mocked(gameRepo.save)).toHaveBeenCalledOnce()
    })

    it('throws InvalidArgumentError when nick is already taken', async () => {
      const game = makeLobbyGame()
      vi.mocked(gameRepo.findByCode).mockResolvedValue(game)

      await expect(
        service.execute(new JoinGameCommand('player-2', 'ABC123', null, 'Host')),
      ).rejects.toThrow(InvalidArgumentError)
    })
  })

  describe('reconnect (non-lobby)', () => {
    it('matches a guest by nick (case-insensitive) and returns existing playerId', async () => {
      const game = makeLobbyGame()
      game.addPlayer(new PlayerIdVo('guest-player-id'), null, 'Alice')
      game.start()
      vi.mocked(gameRepo.findByCode).mockResolvedValue(game)

      const result = await service.execute(
        new JoinGameCommand('ignored-id', 'ABC123', null, 'alice'),
      )

      expect(result.playerId).toBe('guest-player-id')
    })

    it('matches a logged-in user by userId and returns existing playerId', async () => {
      const game = makeLobbyGame()
      game.addPlayer(new PlayerIdVo('user-player-id'), new UserIdVo('user-id-99'), 'Bob')
      game.start()
      vi.mocked(gameRepo.findByCode).mockResolvedValue(game)

      const result = await service.execute(
        new JoinGameCommand('ignored-id', 'ABC123', 'user-id-99', 'Bob'),
      )

      expect(result.playerId).toBe('user-player-id')
    })

    it('throws NotFoundError when no matching player is found', async () => {
      const game = makeLobbyGame()
      game.start()
      vi.mocked(gameRepo.findByCode).mockResolvedValue(game)

      await expect(
        service.execute(new JoinGameCommand('ignored-id', 'ABC123', null, 'Unknown')),
      ).rejects.toThrow(NotFoundError)
    })
  })

  it('throws NotFoundError when game does not exist', async () => {
    vi.mocked(gameRepo.findByCode).mockResolvedValue(null)
    await expect(
      service.execute(new JoinGameCommand('player-id', 'ABC123', null, 'Alice')),
    ).rejects.toThrow(NotFoundError)
  })
})
