// === src/Scoring/Application/__tests__/AdvanceCursorService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AdvanceCursorService } from '#/Scoring/Application/AdvanceCursorService.js'
import { VerificationAggregate } from '#/Scoring/Domain/VerificationAggregate.js'
import { VerificationIdVo } from '#/Scoring/Domain/ValueObjects/VerificationIdVo.js'
import { AiScoreVo } from '#/Scoring/Domain/ValueObjects/AiScoreVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import type { IVerificationRepository } from '#/Scoring/Domain/VerificationRepository.js'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'

let counter = 0
const makeItemId = (): string => `item-${++counter}`

const makeGameState = (currentRound = 1, roundCount = 3) => ({
  currentRoundNumber: currentRound,
  roundCount,
  scoringConfig: {
    uniqueOnlyPoints: 15,
    uniquePoints: 10,
    duplicatePoints: 5,
    closingTimeSeconds: 15,
    verificationTimeoutSeconds: 30,
  },
  categories: [],
  players: [
    { playerId: 'p1', nick: 'Alice', score: 0, isConnected: true },
    { playerId: 'p2', nick: 'Bob', score: 0, isConnected: true },
  ],
})

const makeTwoItemVerification = (): VerificationAggregate => {
  const v = VerificationAggregate.create(
    new VerificationIdVo('v-1'),
    new RoundIdVo('round-1'),
    new GameIdVo('game-1'),
    [
      { playerId: new PlayerIdVo('p1'), categoryId: 'cat-1', value: 'Poland' },
      { playerId: new PlayerIdVo('p2'), categoryId: 'cat-1', value: 'Peru' },
    ],
    makeItemId,
  )
  v.setAiResult(new PlayerIdVo('p1'), 'cat-1', new AiScoreVo(80), 'good')
  v.setAiResult(new PlayerIdVo('p2'), 'cat-1', new AiScoreVo(80), 'good')
  return v
}

const makeSingleItemVerification = (): VerificationAggregate => {
  const v = VerificationAggregate.create(
    new VerificationIdVo('v-1'),
    new RoundIdVo('round-1'),
    new GameIdVo('game-1'),
    [{ playerId: new PlayerIdVo('p1'), categoryId: 'cat-1', value: 'Poland' }],
    makeItemId,
  )
  v.setAiResult(new PlayerIdVo('p1'), 'cat-1', new AiScoreVo(80), 'good')
  return v
}

describe('AdvanceCursorService', () => {
  let verificationRepository: IVerificationRepository
  let gameFacade: IGameFacade
  let service: AdvanceCursorService

  beforeEach(() => {
    verificationRepository = {
      findById: vi.fn(),
      findByRoundId: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      saveAiResult: vi.fn().mockResolvedValue(undefined),
    }
    gameFacade = {
      startRound: vi.fn(),
      updatePlayerScore: vi.fn().mockResolvedValue(undefined),
      updatePlayerScores: vi.fn().mockResolvedValue(undefined),
      finishGame: vi.fn().mockResolvedValue(undefined),
      getGameState: vi.fn().mockResolvedValue(makeGameState()),
    }
    service = new AdvanceCursorService(verificationRepository, gameFacade)
  })

  it('returns the resolved item and next item when not finished', async () => {
    vi.mocked(verificationRepository.findById).mockResolvedValue(makeTwoItemVerification())
    const result = await service.execute({ verificationId: 'v-1' })
    expect(result.resolved.playerId).toBe('p1')
    expect(result.isFinished).toBe(false)
    expect(result.nextItem).not.toBeNull()
    expect(result.nextItem?.playerId).toBe('p2')
  })

  it('saves the verification after advancing', async () => {
    vi.mocked(verificationRepository.findById).mockResolvedValue(makeTwoItemVerification())
    await service.execute({ verificationId: 'v-1' })
    expect(verificationRepository.save).toHaveBeenCalledOnce()
  })

  it('calls updatePlayerScores for players with points when finished', async () => {
    vi.mocked(verificationRepository.findById).mockResolvedValue(makeSingleItemVerification())
    await service.execute({ verificationId: 'v-1' })
    expect(gameFacade.updatePlayerScores).toHaveBeenCalled()
  })

  it('does not call finishGame when not the last round', async () => {
    vi.mocked(verificationRepository.findById).mockResolvedValue(makeSingleItemVerification())
    vi.mocked(gameFacade.getGameState).mockResolvedValue(makeGameState(1, 3))
    await service.execute({ verificationId: 'v-1' })
    expect(gameFacade.finishGame).not.toHaveBeenCalled()
  })

  it('calls finishGame when it is the last round', async () => {
    vi.mocked(verificationRepository.findById).mockResolvedValue(makeSingleItemVerification())
    vi.mocked(gameFacade.getGameState).mockResolvedValue(makeGameState(3, 3))
    await service.execute({ verificationId: 'v-1' })
    expect(gameFacade.finishGame).toHaveBeenCalledOnce()
  })

  it('returns roundScores and standings from fresh game state when finished', async () => {
    vi.mocked(verificationRepository.findById).mockResolvedValue(makeSingleItemVerification())
    const result = await service.execute({ verificationId: 'v-1' })
    expect(result.roundScores).not.toBeNull()
    expect(result.standings).not.toBeNull()
    expect(result.standings).toHaveLength(2)
  })
})
