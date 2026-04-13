// === src/Game/Domain/__tests__/GameAggregate.spec.ts ===

import { describe, it, expect, beforeEach } from 'vitest'
import { GameAggregate } from '#/Game/Domain/GameAggregate.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { GameCodeVo } from '#/Game/Domain/ValueObjects/GameCodeVo.js'
import { GameStatus } from '#/Game/Domain/ValueObjects/GameStatusVo.js'
import { RoundCountVo } from '#/Game/Domain/ValueObjects/RoundCountVo.js'
import { CategoryConfig } from '#/Game/Domain/Entities/CategoryConfig.js'
import { ScoringConfig } from '#/Game/Domain/Entities/ScoringConfig.js'
import { CategoryIdVo } from '#/Game/Domain/ValueObjects/CategoryIdVo.js'
import { AlphabetPreset } from '#/Game/Domain/ValueObjects/AlphabetPresetVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'

const makeId = (): GameIdVo => new GameIdVo('game-id-1')
const makeCode = (): GameCodeVo => new GameCodeVo('ABC123')
const makeHostPlayerId = (): PlayerIdVo => new PlayerIdVo('host-player-id')
const makeHostUserId = (): UserIdVo => new UserIdVo('host-user-id')
const makePlayerId = (v = 'player-id-2'): PlayerIdVo => new PlayerIdVo(v)

const makeConfig = () => ({
  alphabetPreset: AlphabetPreset.EN,
  roundCount: new RoundCountVo(3),
  categories: [new CategoryConfig(new CategoryIdVo('cat-1'), 'Country', 'A sovereign country')],
  scoringConfig: new ScoringConfig(15, 10, 5, 15, 30, 60),
})

const makeGame = (): GameAggregate =>
  GameAggregate.create(
    makeId(),
    makeCode(),
    makeHostPlayerId(),
    makeHostUserId(),
    'Host',
    makeConfig(),
  )

describe('GameAggregate', () => {
  describe('create()', () => {
    it('sets status to lobby', () => {
      expect(makeGame().status).toBe(GameStatus.lobby)
    })

    it('sets currentRoundNumber to 0', () => {
      expect(makeGame().currentRoundNumber).toBe(0)
    })

    it('adds the host as the first player', () => {
      const game = makeGame()
      expect(game.players).toHaveLength(1)
      expect(game.players[0]?.nick).toBe('Host')
      expect(game.players[0]?.isHost).toBe(true)
    })

    it('initializes usedLetters as empty', () => {
      expect(makeGame().usedLetters).toHaveLength(0)
    })
  })

  describe('addPlayer()', () => {
    let game: GameAggregate

    beforeEach(() => {
      game = makeGame()
    })

    it('adds a new player to the game', () => {
      game.addPlayer(makePlayerId(), null, 'Alice')
      expect(game.players).toHaveLength(2)
      expect(game.players[1]?.nick).toBe('Alice')
    })

    it('throws InvalidArgumentError when game is not in lobby status', () => {
      game.start()
      expect(() => game.addPlayer(makePlayerId(), null, 'Alice')).toThrow(InvalidArgumentError)
    })

    it('throws InvalidArgumentError when nick is already taken (case-insensitive)', () => {
      game.addPlayer(makePlayerId(), null, 'Alice')
      expect(() => game.addPlayer(makePlayerId('player-id-3'), null, 'alice')).toThrow(
        InvalidArgumentError,
      )
    })

    it('throws InvalidArgumentError when game is full', () => {
      for (let i = 2; i <= 20; i++) {
        game.addPlayer(makePlayerId(`player-${i}`), null, `Player${i}`)
      }
      expect(() => game.addPlayer(makePlayerId('player-21'), null, 'Player21')).toThrow(
        InvalidArgumentError,
      )
    })
  })

  describe('start()', () => {
    it('transitions status to active', () => {
      const game = makeGame()
      game.start()
      expect(game.status).toBe(GameStatus.active)
    })

    it('throws InvalidArgumentError when not in lobby', () => {
      const game = makeGame()
      game.start()
      expect(() => game.start()).toThrow(InvalidArgumentError)
    })
  })

  describe('cancel()', () => {
    it('transitions status to cancelled from lobby', () => {
      const game = makeGame()
      game.cancel()
      expect(game.status).toBe(GameStatus.cancelled)
    })

    it('transitions status to cancelled from active', () => {
      const game = makeGame()
      game.start()
      game.cancel()
      expect(game.status).toBe(GameStatus.cancelled)
    })

    it('throws InvalidArgumentError when already finished', () => {
      const game = makeGame()
      game.start()
      game.finish()
      expect(() => game.cancel()).toThrow(InvalidArgumentError)
    })
  })

  describe('drawLetter()', () => {
    it('returns a letter from the alphabet', () => {
      const game = makeGame()
      const letter = game.drawLetter()
      expect(typeof letter).toBe('string')
      expect(letter.length).toBe(1)
    })

    it('adds the drawn letter to usedLetters', () => {
      const game = makeGame()
      const letter = game.drawLetter()
      expect(game.usedLetters).toContain(letter)
    })

    it('does not draw the same letter twice', () => {
      const game = makeGame()
      const drawn = new Set<string>()
      for (let i = 0; i < 26; i++) {
        drawn.add(game.drawLetter())
      }
      expect(drawn.size).toBe(26)
    })

    it('throws InvalidArgumentError when all letters are exhausted', () => {
      const game = makeGame()
      for (let i = 0; i < 26; i++) {
        game.drawLetter()
      }
      expect(() => game.drawLetter()).toThrow(InvalidArgumentError)
    })
  })

  describe('advanceRound()', () => {
    it('increments currentRoundNumber by 1', () => {
      const game = makeGame()
      game.advanceRound()
      expect(game.currentRoundNumber).toBe(1)
    })
  })

  describe('finish()', () => {
    it('transitions status to finished from active', () => {
      const game = makeGame()
      game.start()
      game.finish()
      expect(game.status).toBe(GameStatus.finished)
    })

    it('throws InvalidArgumentError when not in active status', () => {
      const game = makeGame()
      expect(() => game.finish()).toThrow(InvalidArgumentError)
    })
  })

  describe('updatePlayerScore()', () => {
    it('adds points to the player score', () => {
      const game = makeGame()
      game.updatePlayerScore(makeHostPlayerId(), 10)
      expect(game.players[0]?.score).toBe(10)
    })

    it('accumulates multiple score updates', () => {
      const game = makeGame()
      game.updatePlayerScore(makeHostPlayerId(), 10)
      game.updatePlayerScore(makeHostPlayerId(), 5)
      expect(game.players[0]?.score).toBe(15)
    })

    it('throws NotFoundError when player does not exist', () => {
      const game = makeGame()
      expect(() => game.updatePlayerScore(makePlayerId('unknown'), 10)).toThrow(NotFoundError)
    })
  })

  describe('setPlayerConnected()', () => {
    it('updates isConnected and socketId', () => {
      const game = makeGame()
      game.setPlayerConnected(makeHostPlayerId(), 'socket-abc', true)
      expect(game.players[0]?.isConnected).toBe(true)
      expect(game.players[0]?.socketId).toBe('socket-abc')
    })

    it('can set socketId to null on disconnect', () => {
      const game = makeGame()
      game.setPlayerConnected(makeHostPlayerId(), 'socket-abc', true)
      game.setPlayerConnected(makeHostPlayerId(), null, false)
      expect(game.players[0]?.isConnected).toBe(false)
      expect(game.players[0]?.socketId).toBeNull()
    })

    it('throws NotFoundError when player does not exist', () => {
      const game = makeGame()
      expect(() => game.setPlayerConnected(makePlayerId('unknown'), null, false)).toThrow(
        NotFoundError,
      )
    })
  })
})
