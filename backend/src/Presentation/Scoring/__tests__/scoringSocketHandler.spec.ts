// === src/Presentation/Scoring/__tests__/scoringSocketHandler.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ScoringController } from '#/Presentation/Scoring/scoringSocketHandler.js'
import type { ICastVoteService } from '#/Scoring/Application/CastVoteService.js'
import type { IAdvanceCursorService } from '#/Scoring/Application/AdvanceCursorService.js'
import type { IGameFacade, IGameStateDto } from '#/Game/Domain/GameFacade.js'
import type { Server, Socket } from 'socket.io'
import type pino from 'pino'

const makeLogger = (): pino.Logger => {
  const child = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnValue(child),
  } as unknown as pino.Logger
}

const makeGameFacade = (): IGameFacade => ({
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
    players: [],
  } satisfies IGameStateDto),
})

const makeCastVoteService = (): ICastVoteService => ({
  execute: vi.fn().mockResolvedValue({
    verificationId: 'v-1',
    gameId: 'game-1',
    voterId: 'p2',
    allEligibleVotesCast: false,
  }),
})

const makeAdvanceCursorService = (): IAdvanceCursorService => ({
  execute: vi.fn().mockResolvedValue({
    gameId: 'game-1',
    resolved: { playerId: 'p1', categoryId: 'cat-1', isAccepted: true },
    isFinished: false,
    nextItem: {
      playerId: 'p2',
      categoryId: 'cat-1',
      value: 'Peru',
      aiScore: 80,
      aiReasoning: 'good',
    },
    roundScores: null,
    standings: null,
    isLastRound: false,
  }),
})

const makeRoomEmit = () => vi.fn()
const makeIo = () => ({
  to: vi.fn().mockReturnValue({ emit: makeRoomEmit() }),
})

const captureHandlers = (socket: Socket): Record<string, (...args: unknown[]) => Promise<void>> => {
  const handlers: Record<string, (...args: unknown[]) => Promise<void>> = {}
  vi.mocked(socket.on).mockImplementation(
    (event: string, handler: (...args: unknown[]) => void) => {
      handlers[event] = handler as (...args: unknown[]) => Promise<void>
      return socket
    },
  )
  return handlers
}

const makeSocket = (overrides: Partial<{ data: unknown }> = {}): Socket =>
  ({
    id: 'socket-id-1',
    data: { gameId: 'game-1', playerId: 'p2', isHost: false },
    emit: vi.fn(),
    on: vi.fn(),
    ...overrides,
  }) as unknown as Socket

describe('ScoringController', () => {
  let castVoteService: ICastVoteService
  let advanceCursorService: IAdvanceCursorService
  let io: ReturnType<typeof makeIo>
  let controller: ScoringController

  beforeEach(() => {
    vi.useFakeTimers()
    castVoteService = makeCastVoteService()
    advanceCursorService = makeAdvanceCursorService()
    io = makeIo()
    controller = new ScoringController(
      io as unknown as Server,
      castVoteService,
      advanceCursorService,
      makeGameFacade(),
      makeLogger(),
    )
  })

  describe('scoring:cast_vote', () => {
    it('emits error when socket data is missing', async () => {
      const socket = makeSocket({ data: {} })
      const handlers = captureHandlers(socket)
      controller.register(socket)
      await handlers['scoring:cast_vote']?.({ verificationId: 'v-1', accepted: true })
      expect(socket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.any(String) }),
      )
    })

    it('emits error when payload is invalid', async () => {
      const socket = makeSocket()
      const handlers = captureHandlers(socket)
      controller.register(socket)
      await handlers['scoring:cast_vote']?.({ verificationId: '', accepted: 'yes' })
      expect(socket.emit).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.any(String) }),
      )
    })

    it('calls castVoteService with correct command', async () => {
      const socket = makeSocket()
      const handlers = captureHandlers(socket)
      controller.register(socket)
      await handlers['scoring:cast_vote']?.({ verificationId: 'v-1', accepted: true })
      expect(castVoteService.execute).toHaveBeenCalledWith(
        expect.objectContaining({ verificationId: 'v-1', voterId: 'p2', accepted: true }),
      )
    })

    it('emits scoring:vote_cast to the room', async () => {
      const socket = makeSocket()
      const handlers = captureHandlers(socket)
      controller.register(socket)
      await handlers['scoring:cast_vote']?.({ verificationId: 'v-1', accepted: true })
      expect(io.to).toHaveBeenCalledWith('game-1')
    })

    it('advances cursor and cancels timer when allEligibleVotesCast is true', async () => {
      vi.mocked(castVoteService.execute).mockResolvedValue({
        verificationId: 'v-1',
        gameId: 'game-1',
        voterId: 'p2',
        allEligibleVotesCast: true,
      })
      const socket = makeSocket()
      const handlers = captureHandlers(socket)
      controller.register(socket)
      await handlers['scoring:cast_vote']?.({ verificationId: 'v-1', accepted: true })
      expect(advanceCursorService.execute).toHaveBeenCalledWith({ verificationId: 'v-1' })
    })
  })

  describe('eventEmitter', () => {
    it('emitAiProcessingStarted emits to the game room', () => {
      controller.eventEmitter.emitAiProcessingStarted('game-1', 'v-1', 3)
      expect(io.to).toHaveBeenCalledWith('game-1')
    })

    it('emitAiProcessingDone emits ai_processing_done and answer_revealed and starts timer', () => {
      const firstItem = {
        playerId: 'p1',
        categoryId: 'cat-1',
        value: 'Poland',
        aiScore: 80,
        aiReasoning: 'good',
      }
      controller.eventEmitter.emitAiProcessingDone('game-1', 'v-1', firstItem)
      expect(io.to).toHaveBeenCalledWith('game-1')
    })

    it('emitAiProcessingDone with null firstItem does not start timer', () => {
      controller.eventEmitter.emitAiProcessingDone('game-1', 'v-1', null)
      vi.runAllTimers()
      expect(advanceCursorService.execute).not.toHaveBeenCalled()
    })
  })

  describe('timer expiry', () => {
    it('calls advanceCursorService when timer fires', async () => {
      vi.mocked(advanceCursorService.execute).mockResolvedValue({
        gameId: 'game-1',
        resolved: { playerId: 'p1', categoryId: 'cat-1', isAccepted: true },
        isFinished: true,
        nextItem: null,
        roundScores: { p1: 15 },
        standings: [{ playerId: 'p1', nick: 'Alice', score: 15 }],
        isLastRound: false,
      })
      controller.eventEmitter.emitAiProcessingDone('game-1', 'v-1', {
        playerId: 'p1',
        categoryId: 'cat-1',
        value: 'Poland',
        aiScore: 80,
        aiReasoning: 'good',
      })
      await vi.runAllTimersAsync()
      await vi.waitFor(() =>
        expect(advanceCursorService.execute).toHaveBeenCalledWith({ verificationId: 'v-1' }),
      )
    })
  })

  describe('verification finished', () => {
    it('emits verification_finished and standings when isFinished is true', async () => {
      vi.mocked(advanceCursorService.execute).mockResolvedValue({
        gameId: 'game-1',
        resolved: { playerId: 'p1', categoryId: 'cat-1', isAccepted: true },
        isFinished: true,
        nextItem: null,
        roundScores: { p1: 15, p2: 0 },
        standings: [{ playerId: 'p1', nick: 'Alice', score: 15 }],
        isLastRound: false,
      })
      controller.eventEmitter.emitAiProcessingDone('game-1', 'v-1', {
        playerId: 'p1',
        categoryId: 'cat-1',
        value: 'Poland',
        aiScore: 80,
        aiReasoning: 'good',
      })
      await vi.runAllTimersAsync()
      await vi.waitFor(() => expect(advanceCursorService.execute).toHaveBeenCalled())
      expect(io.to).toHaveBeenCalledWith('game-1')
    })
  })
})
