// === src/Round/Domain/__tests__/RoundAggregate.spec.ts ===

import { describe, it, expect, beforeEach } from 'vitest'
import { RoundAggregate } from '#/Round/Domain/RoundAggregate.js'
import { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import { RoundLetterVo } from '#/Round/Domain/ValueObjects/RoundLetterVo.js'
import { RoundStatus } from '#/Round/Domain/ValueObjects/RoundStatusVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

const makeRoundId = (): RoundIdVo => new RoundIdVo('round-id-1')
const makeGameId = (): GameIdVo => new GameIdVo('game-id-1')
const makeLetter = (): RoundLetterVo => new RoundLetterVo('A')
const makePlayerId = (v = 'player-1'): PlayerIdVo => new PlayerIdVo(v)

const makeRound = (playerIds: PlayerIdVo[] = [makePlayerId()]): RoundAggregate =>
  RoundAggregate.create(makeRoundId(), makeGameId(), 1, makeLetter(), playerIds)

describe('RoundAggregate', () => {
  describe('create()', () => {
    it('sets status to answering', () => {
      expect(makeRound().status).toBe(RoundStatus.answering)
    })

    it('sets closingDeadline to null', () => {
      expect(makeRound().closingDeadline).toBeNull()
    })

    it('initialises one PlayerAnswers entry per player', () => {
      const round = makeRound([makePlayerId('p1'), makePlayerId('p2')])
      expect(round.getSubmittedAnswers()).toHaveLength(2)
    })

    it('initialises all PlayerAnswers with empty answers and null submittedAt', () => {
      const round = makeRound([makePlayerId()])
      const pa = round.getSubmittedAnswers()[0]!
      expect(pa.submittedAt).toBeNull()
      expect(pa.answers.size).toBe(0)
    })
  })

  describe('submitAnswers()', () => {
    let round: RoundAggregate

    beforeEach(() => {
      round = makeRound([makePlayerId('p1'), makePlayerId('p2')])
    })

    it('stores answers and sets submittedAt for the player', () => {
      const answers = new Map([['cat-1', 'Poland']])
      round.submitAnswers(makePlayerId('p1'), answers)
      const pa = round.getSubmittedAnswers().find((a) => a.playerId.value === 'p1')!
      expect(pa.answers.get('cat-1')).toBe('Poland')
      expect(pa.submittedAt).not.toBeNull()
    })

    it('throws InvalidArgumentError when player already submitted', () => {
      round.submitAnswers(makePlayerId('p1'), new Map())
      expect(() => round.submitAnswers(makePlayerId('p1'), new Map())).toThrow(InvalidArgumentError)
    })

    it('throws InvalidArgumentError when round status is finished', () => {
      round.close()
      expect(() => round.submitAnswers(makePlayerId('p1'), new Map())).toThrow(InvalidArgumentError)
    })

    it('succeeds when round status is closing', () => {
      const deadline = new Date(Date.now() + 15000)
      round.submitAnswers(makePlayerId('p1'), new Map())
      round.startClosing(deadline)
      expect(() => round.submitAnswers(makePlayerId('p2'), new Map())).not.toThrow()
    })

    it('throws InvalidArgumentError when player is not in the round', () => {
      expect(() => round.submitAnswers(makePlayerId('unknown'), new Map())).toThrow(
        InvalidArgumentError,
      )
    })
  })

  describe('startClosing()', () => {
    it('transitions status to closing and sets deadline', () => {
      const round = makeRound()
      const deadline = new Date(Date.now() + 15000)
      round.startClosing(deadline)
      expect(round.status).toBe(RoundStatus.closing)
      expect(round.closingDeadline).toBe(deadline)
    })

    it('throws InvalidArgumentError when status is not answering', () => {
      const round = makeRound()
      const deadline = new Date(Date.now() + 15000)
      round.startClosing(deadline)
      expect(() => round.startClosing(new Date())).toThrow(InvalidArgumentError)
    })
  })

  describe('close()', () => {
    it('transitions status to finished from answering', () => {
      const round = makeRound()
      round.close()
      expect(round.status).toBe(RoundStatus.finished)
    })

    it('transitions status to finished from closing', () => {
      const round = makeRound()
      round.startClosing(new Date(Date.now() + 15000))
      round.close()
      expect(round.status).toBe(RoundStatus.finished)
    })

    it('throws InvalidArgumentError when already finished', () => {
      const round = makeRound()
      round.close()
      expect(() => round.close()).toThrow(InvalidArgumentError)
    })
  })

  describe('hasAllSubmitted()', () => {
    it('returns false when no player has submitted', () => {
      const round = makeRound([makePlayerId('p1'), makePlayerId('p2')])
      expect(round.hasAllSubmitted()).toBe(false)
    })

    it('returns false when only some players have submitted', () => {
      const round = makeRound([makePlayerId('p1'), makePlayerId('p2')])
      round.submitAnswers(makePlayerId('p1'), new Map())
      expect(round.hasAllSubmitted()).toBe(false)
    })

    it('returns true when all players have submitted', () => {
      const round = makeRound([makePlayerId('p1'), makePlayerId('p2')])
      round.submitAnswers(makePlayerId('p1'), new Map())
      round.startClosing(new Date(Date.now() + 15000))
      round.submitAnswers(makePlayerId('p2'), new Map())
      expect(round.hasAllSubmitted()).toBe(true)
    })
  })

  describe('getSubmittedAnswers()', () => {
    it('includes all players, even those who did not submit', () => {
      const round = makeRound([makePlayerId('p1'), makePlayerId('p2')])
      round.submitAnswers(makePlayerId('p1'), new Map([['cat-1', 'France']]))
      const all = round.getSubmittedAnswers()
      expect(all).toHaveLength(2)
      const p2 = all.find((a) => a.playerId.value === 'p2')!
      expect(p2.submittedAt).toBeNull()
      expect(p2.answers.size).toBe(0)
    })
  })
})
