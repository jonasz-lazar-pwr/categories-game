// === src/Scoring/Application/__tests__/CastVoteService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CastVoteService } from '#/Scoring/Application/CastVoteService.js'
import { CastVoteCommand } from '#/Scoring/Application/CommandDto/CastVoteCommand.js'
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

const makeReadyVerification = (): VerificationAggregate => {
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

describe('CastVoteService', () => {
  let verificationRepository: IVerificationRepository
  let gameFacade: IGameFacade
  let service: CastVoteService

  const makePlayers = (connected: string[], allIds: string[]) =>
    allIds.map((id) => ({
      playerId: id,
      nick: id,
      score: 0,
      isConnected: connected.includes(id),
    }))

  beforeEach(() => {
    verificationRepository = {
      findById: vi.fn().mockResolvedValue(makeReadyVerification()),
      findByRoundId: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      saveAiResult: vi.fn().mockResolvedValue(undefined),
    }
    gameFacade = {
      startRound: vi.fn(),
      updatePlayerScore: vi.fn(),
      updatePlayerScores: vi.fn(),
      finishGame: vi.fn(),
      getGameState: vi.fn().mockResolvedValue({
        currentRoundNumber: 1,
        roundCount: 3,
        scoringConfig: {
          uniqueOnlyPoints: 15,
          uniquePoints: 10,
          duplicatePoints: 5,
          closingTimeSeconds: 15,
          verificationTimeoutSeconds: 30,
        },
        categories: [],
        players: makePlayers(['p1', 'p2'], ['p1', 'p2']),
      }),
    }
    service = new CastVoteService(verificationRepository, gameFacade)
  })

  it('saves the verification after casting vote', async () => {
    await service.execute(new CastVoteCommand('v-1', 'p2', true))
    expect(verificationRepository.save).toHaveBeenCalledOnce()
  })

  it('returns allEligibleVotesCast false when some connected players have not voted', async () => {
    // p2 and p3 both connected, only p2 voting
    vi.mocked(gameFacade.getGameState).mockResolvedValue({
      currentRoundNumber: 1,
      roundCount: 3,
      scoringConfig: {
        uniqueOnlyPoints: 15,
        uniquePoints: 10,
        duplicatePoints: 5,
        closingTimeSeconds: 15,
        verificationTimeoutSeconds: 30,
      },
      categories: [],
      players: makePlayers(['p1', 'p2', 'p3'], ['p1', 'p2', 'p3']),
    })
    const result = await service.execute(new CastVoteCommand('v-1', 'p2', true))
    expect(result.allEligibleVotesCast).toBe(false)
  })

  it('returns allEligibleVotesCast true when all eligible connected players have voted', async () => {
    // Only p2 connected (p1 is the answer owner, p3 disconnected)
    vi.mocked(gameFacade.getGameState).mockResolvedValue({
      currentRoundNumber: 1,
      roundCount: 3,
      scoringConfig: {
        uniqueOnlyPoints: 15,
        uniquePoints: 10,
        duplicatePoints: 5,
        closingTimeSeconds: 15,
        verificationTimeoutSeconds: 30,
      },
      categories: [],
      players: makePlayers(['p1', 'p2'], ['p1', 'p2']),
    })
    const result = await service.execute(new CastVoteCommand('v-1', 'p2', true))
    expect(result.allEligibleVotesCast).toBe(true)
  })

  it('excludes disconnected players from eligible voters', async () => {
    vi.mocked(gameFacade.getGameState).mockResolvedValue({
      currentRoundNumber: 1,
      roundCount: 3,
      scoringConfig: {
        uniqueOnlyPoints: 15,
        uniquePoints: 10,
        duplicatePoints: 5,
        closingTimeSeconds: 15,
        verificationTimeoutSeconds: 30,
      },
      categories: [],
      players: makePlayers(['p1', 'p2'], ['p1', 'p2', 'p3']),
    })
    // p3 is not connected — only p2 needs to vote
    const result = await service.execute(new CastVoteCommand('v-1', 'p2', true))
    expect(result.allEligibleVotesCast).toBe(true)
  })
})
