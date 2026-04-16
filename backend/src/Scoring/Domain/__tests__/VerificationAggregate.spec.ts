// === src/Scoring/Domain/__tests__/VerificationAggregate.spec.ts ===

import { describe, it, expect } from 'vitest'
import { VerificationAggregate } from '#/Scoring/Domain/VerificationAggregate.js'
import { VerificationIdVo } from '#/Scoring/Domain/ValueObjects/VerificationIdVo.js'
import { VerificationStatus } from '#/Scoring/Domain/ValueObjects/VerificationStatusVo.js'
import { AiScoreVo } from '#/Scoring/Domain/ValueObjects/AiScoreVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

let itemCounter = 0
const makeId = (): string => `item-${++itemCounter}`

const makeVerificationId = (): VerificationIdVo => new VerificationIdVo('verification-1')
const makeRoundId = (): RoundIdVo => new RoundIdVo('round-1')
const makeGameId = (): GameIdVo => new GameIdVo('game-1')
const makePlayer = (id = 'player-1'): PlayerIdVo => new PlayerIdVo(id)

const makeVerification = (
  answers: Array<{ playerId: PlayerIdVo; categoryId: string; value: string }>,
): VerificationAggregate =>
  VerificationAggregate.create(makeVerificationId(), makeRoundId(), makeGameId(), answers, makeId)

const SCORING_CONFIG = { uniqueOnlyPoints: 15, uniquePoints: 10, duplicatePoints: 5 }

describe('VerificationAggregate', () => {
  describe('create()', () => {
    it('sets status to ai_processing', () => {
      const v = makeVerification([{ playerId: makePlayer(), categoryId: 'cat-1', value: 'Poland' }])
      expect(v.status).toBe(VerificationStatus.ai_processing)
    })

    it('empty-value items get aiScore 0', () => {
      const v = makeVerification([{ playerId: makePlayer(), categoryId: 'cat-1', value: '' }])
      expect(v.items[0]?.aiScore?.value).toBe(0)
    })

    it('non-empty items start with null aiScore', () => {
      const v = makeVerification([{ playerId: makePlayer(), categoryId: 'cat-1', value: 'Poland' }])
      expect(v.items[0]?.aiScore).toBeNull()
    })

    it('sets cursor to null initially', () => {
      const v = makeVerification([{ playerId: makePlayer(), categoryId: 'cat-1', value: 'Poland' }])
      expect(v.cursorPlayerId).toBeNull()
      expect(v.cursorCategoryId).toBeNull()
    })
  })

  describe('setAiResult()', () => {
    it('does not transition to in_progress until all non-empty items have scores', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
        { playerId: makePlayer('p2'), categoryId: 'cat-1', value: 'Peru' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      expect(v.status).toBe(VerificationStatus.ai_processing)
    })

    it('transitions to in_progress when all non-empty items have AI scores', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
        { playerId: makePlayer('p2'), categoryId: 'cat-1', value: 'Peru' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      v.setAiResult(makePlayer('p2'), 'cat-1', new AiScoreVo(90), 'good')
      expect(v.status).toBe(VerificationStatus.in_progress)
    })

    it('sets cursor to first item after transition', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      expect(v.cursorPlayerId?.value).toBe('p1')
      expect(v.cursorCategoryId).toBe('cat-1')
    })

    it('empty-value items are skipped in the AI transition check', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
        { playerId: makePlayer('p2'), categoryId: 'cat-1', value: '' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      expect(v.status).toBe(VerificationStatus.in_progress)
    })
  })

  describe('castVote()', () => {
    const makeReadyVerification = (): VerificationAggregate => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      return v
    }

    it('throws InvalidArgumentError when status is not in_progress', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
      ])
      expect(() => v.castVote(makePlayer('p2'), makePlayer('p1'), 'cat-1', true)).toThrow(
        InvalidArgumentError,
      )
    })

    it('throws InvalidArgumentError when voter is the answer owner', () => {
      const v = makeReadyVerification()
      expect(() => v.castVote(makePlayer('p1'), makePlayer('p1'), 'cat-1', true)).toThrow(
        InvalidArgumentError,
      )
    })

    it('adds vote to the correct item', () => {
      const v = makeReadyVerification()
      v.castVote(makePlayer('p2'), makePlayer('p1'), 'cat-1', true)
      expect(v.items[0]?.votes).toHaveLength(1)
      expect(v.items[0]?.votes[0]?.accepted).toBe(true)
    })
  })

  describe('resolveItem()', () => {
    it('resolves empty answer as rejected', () => {
      const v = makeVerification([{ playerId: makePlayer('p1'), categoryId: 'cat-1', value: '' }])
      v.resolveItem(makePlayer('p1'), 'cat-1')
      expect(v.items[0]?.isAccepted).toBe(false)
      expect(v.items[0]?.isResolved).toBe(true)
    })

    it('passes when accepted votes + AI >= 50% of total votes', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      // 1 player vote (accept) + AI (accept at 80) = 2/2 = 100% → pass
      v.castVote(makePlayer('p2'), makePlayer('p1'), 'cat-1', true)
      v.resolveItem(makePlayer('p1'), 'cat-1')
      expect(v.items[0]?.isAccepted).toBe(true)
    })

    it('fails when accepted votes + AI < 50% of total votes', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(20), 'borderline')
      // 2 player votes (reject) + AI (reject at 20) = 0/3 = 0% → fail
      v.castVote(makePlayer('p2'), makePlayer('p1'), 'cat-1', false)
      v.castVote(makePlayer('p3'), makePlayer('p1'), 'cat-1', false)
      v.resolveItem(makePlayer('p1'), 'cat-1')
      expect(v.items[0]?.isAccepted).toBe(false)
    })

    it('ties pass (AI accept, 1 player reject = 1/2 = 50%)', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(60), 'acceptable')
      v.castVote(makePlayer('p2'), makePlayer('p1'), 'cat-1', false)
      // AI accepts (60 >= 50), player rejects → 1 accept / 2 total = 50% → pass
      v.resolveItem(makePlayer('p1'), 'cat-1')
      expect(v.items[0]?.isAccepted).toBe(true)
    })
  })

  describe('advanceCursor()', () => {
    it('resolves the current item before advancing', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
        { playerId: makePlayer('p2'), categoryId: 'cat-1', value: 'Peru' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      v.setAiResult(makePlayer('p2'), 'cat-1', new AiScoreVo(90), 'good')
      v.advanceCursor()
      expect(v.items[0]?.isResolved).toBe(true)
    })

    it('sets cursor to next unresolved item', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
        { playerId: makePlayer('p2'), categoryId: 'cat-1', value: 'Peru' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      v.setAiResult(makePlayer('p2'), 'cat-1', new AiScoreVo(90), 'good')
      v.advanceCursor()
      expect(v.cursorPlayerId?.value).toBe('p2')
    })

    it('transitions to finished when no more items remain', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      v.advanceCursor()
      expect(v.status).toBe(VerificationStatus.finished)
    })
  })

  describe('computeScores()', () => {
    it('awards uniqueOnlyPoints when player is the sole accepted answer in a category', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      v.resolveAll()
      const scores = v.computeScores(SCORING_CONFIG)
      expect(scores.get('p1')).toBe(SCORING_CONFIG.uniqueOnlyPoints)
    })

    it('awards uniquePoints when player has a unique answer but others also accepted', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
        { playerId: makePlayer('p2'), categoryId: 'cat-1', value: 'Peru' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      v.setAiResult(makePlayer('p2'), 'cat-1', new AiScoreVo(80), 'good')
      v.resolveAll()
      const scores = v.computeScores(SCORING_CONFIG)
      expect(scores.get('p1')).toBe(SCORING_CONFIG.uniquePoints)
      expect(scores.get('p2')).toBe(SCORING_CONFIG.uniquePoints)
    })

    it('awards duplicatePoints when multiple players share the same accepted value', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
        { playerId: makePlayer('p2'), categoryId: 'cat-1', value: 'poland' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      v.setAiResult(makePlayer('p2'), 'cat-1', new AiScoreVo(80), 'good')
      v.resolveAll()
      const scores = v.computeScores(SCORING_CONFIG)
      expect(scores.get('p1')).toBe(SCORING_CONFIG.duplicatePoints)
      expect(scores.get('p2')).toBe(SCORING_CONFIG.duplicatePoints)
    })

    it('awards 0 points for non-accepted answers', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(20), 'wrong')
      v.resolveAll()
      const scores = v.computeScores(SCORING_CONFIG)
      expect(scores.get('p1')).toBe(0)
    })

    it('mixed scenario: duplicate in one category, unique in another', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: 'Poland' },
        { playerId: makePlayer('p2'), categoryId: 'cat-1', value: 'poland' }, // duplicate
        { playerId: makePlayer('p1'), categoryId: 'cat-2', value: 'Bear' }, // unique (p2 has diff)
        { playerId: makePlayer('p2'), categoryId: 'cat-2', value: 'Buffalo' }, // unique (p1 has diff)
      ])
      v.setAiResult(makePlayer('p1'), 'cat-1', new AiScoreVo(80), 'good')
      v.setAiResult(makePlayer('p2'), 'cat-1', new AiScoreVo(80), 'good')
      v.setAiResult(makePlayer('p1'), 'cat-2', new AiScoreVo(80), 'good')
      v.setAiResult(makePlayer('p2'), 'cat-2', new AiScoreVo(80), 'good')
      v.resolveAll()
      const scores = v.computeScores(SCORING_CONFIG)
      // cat-1: both get duplicatePoints; cat-2: both get uniquePoints
      expect(scores.get('p1')).toBe(SCORING_CONFIG.duplicatePoints + SCORING_CONFIG.uniquePoints)
      expect(scores.get('p2')).toBe(SCORING_CONFIG.duplicatePoints + SCORING_CONFIG.uniquePoints)
    })

    it('returns map containing all players including those with 0 points', () => {
      const v = makeVerification([
        { playerId: makePlayer('p1'), categoryId: 'cat-1', value: '' },
        { playerId: makePlayer('p2'), categoryId: 'cat-1', value: 'Poland' },
      ])
      v.setAiResult(makePlayer('p2'), 'cat-1', new AiScoreVo(80), 'good')
      v.resolveAll()
      const scores = v.computeScores(SCORING_CONFIG)
      expect(scores.has('p1')).toBe(true)
      expect(scores.get('p1')).toBe(0)
    })
  })
})
