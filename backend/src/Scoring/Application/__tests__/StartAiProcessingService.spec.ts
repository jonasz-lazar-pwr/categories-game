// === src/Scoring/Application/__tests__/StartAiProcessingService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StartAiProcessingService } from '#/Scoring/Application/StartAiProcessingService.js'
import { StartAiProcessingCommand } from '#/Scoring/Application/CommandDto/StartAiProcessingCommand.js'
import type { IVerificationRepository } from '#/Scoring/Domain/VerificationRepository.js'
import type { IAiService } from '#/Scoring/Application/IAiService.js'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'
import type { IScoringEventEmitter } from '#/Scoring/Application/ScoringEventEmitter.js'

const makeGameState = () => ({
  currentRoundNumber: 1,
  roundCount: 3,
  scoringConfig: { uniqueOnlyPoints: 15, uniquePoints: 10, duplicatePoints: 5 },
  categories: [{ categoryId: 'cat-1', name: 'Country', description: 'A country' }],
  players: [
    { playerId: 'p1', nick: 'Alice', score: 0, isConnected: true },
    { playerId: 'p2', nick: 'Bob', score: 0, isConnected: true },
  ],
})

describe('StartAiProcessingService', () => {
  let verificationRepository: IVerificationRepository
  let aiService: IAiService
  let gameFacade: IGameFacade
  let eventEmitter: IScoringEventEmitter
  let service: StartAiProcessingService

  beforeEach(() => {
    verificationRepository = {
      findById: vi.fn(),
      findByRoundId: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      saveAiResult: vi.fn().mockResolvedValue(undefined),
    }
    aiService = {
      evaluate: vi.fn().mockResolvedValue({ score: 80, reasoning: 'good' }),
    }
    gameFacade = {
      startRound: vi.fn(),
      updatePlayerScore: vi.fn(),
      updatePlayerScores: vi.fn(),
      finishGame: vi.fn(),
      getGameState: vi.fn().mockResolvedValue(makeGameState()),
    }
    eventEmitter = {
      emitAiProcessingStarted: vi.fn(),
      emitAiProcessingDone: vi.fn(),
    }
    service = new StartAiProcessingService(
      verificationRepository,
      aiService,
      gameFacade,
      eventEmitter,
    )
  })

  it('saves the verification aggregate', async () => {
    const command = new StartAiProcessingCommand('round-1', 'game-1', 'P', [
      { playerId: 'p1', categoryId: 'cat-1', value: 'Poland' },
    ])
    await service.execute(command)
    expect(verificationRepository.save).toHaveBeenCalled()
  })

  it('emits ai_processing_started before returning', async () => {
    const command = new StartAiProcessingCommand('round-1', 'game-1', 'P', [
      { playerId: 'p1', categoryId: 'cat-1', value: 'Poland' },
    ])
    await service.execute(command)
    expect(eventEmitter.emitAiProcessingStarted).toHaveBeenCalledWith(
      'game-1',
      expect.any(String),
      1,
    )
  })

  it('does not call aiService.evaluate for empty answers', async () => {
    const command = new StartAiProcessingCommand('round-1', 'game-1', 'P', [
      { playerId: 'p1', categoryId: 'cat-1', value: '' },
      { playerId: 'p2', categoryId: 'cat-1', value: 'Poland' },
    ])
    await service.execute(command)
    // Allow background task to run
    await vi.waitFor(() => expect(aiService.evaluate).toHaveBeenCalledTimes(1))
  })

  it('calls aiService.evaluate for each non-empty answer', async () => {
    const command = new StartAiProcessingCommand('round-1', 'game-1', 'P', [
      { playerId: 'p1', categoryId: 'cat-1', value: 'Poland' },
      { playerId: 'p2', categoryId: 'cat-1', value: 'Peru' },
    ])
    await service.execute(command)
    await vi.waitFor(() => expect(aiService.evaluate).toHaveBeenCalledTimes(2))
  })

  it('emits ai_processing_done after all AI calls resolve', async () => {
    const command = new StartAiProcessingCommand('round-1', 'game-1', 'P', [
      { playerId: 'p1', categoryId: 'cat-1', value: 'Poland' },
    ])
    await service.execute(command)
    await vi.waitFor(() => expect(eventEmitter.emitAiProcessingDone).toHaveBeenCalledOnce())
  })
})
