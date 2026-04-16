// === src/Presentation/Round/__tests__/roundSocketHandler.spec.ts ===

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerRoundSocketHandler } from '#/Presentation/Round/roundSocketHandler.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type {
  ISubmitAnswersService,
  ISubmitAnswersResult,
} from '#/Round/Application/SubmitAnswersService.js'
import type {
  ICloseRoundService,
  ICloseRoundResult,
} from '#/Round/Application/CloseRoundService.js'
import type { IScoringFacade } from '#/Round/Domain/ScoringFacade.js'
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

const makeSubmitService = (): ISubmitAnswersService => ({ execute: vi.fn() })
const makeCloseService = (): ICloseRoundService => ({ execute: vi.fn() })
const makeScoringFacade = (): IScoringFacade => ({ startAiProcessing: vi.fn() })
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

const makeSocket = (): Socket =>
  ({
    id: 'socket-id-1',
    data: { gameId: 'game-id-1', playerId: 'player-1', isHost: false },
    emit: vi.fn(),
    on: vi.fn(),
  }) as unknown as Socket

const makeIo = () => ({
  to: vi.fn().mockReturnValue({ emit: vi.fn() }),
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

const makeSubmitResult = (overrides: Partial<ISubmitAnswersResult> = {}): ISubmitAnswersResult => ({
  isFirstSubmit: false,
  closingDeadline: undefined,
  allSubmitted: false,
  ...overrides,
})

const makeCloseResult = (): ICloseRoundResult => ({
  closedAnswers: [{ playerId: 'player-1', categoryId: 'cat-1', value: 'Poland' }],
  letter: 'P',
})

describe('roundSocketHandler', () => {
  let submitService: ISubmitAnswersService
  let closeService: ICloseRoundService
  let scoringFacade: IScoringFacade
  let socket: Socket
  let io: ReturnType<typeof makeIo>
  let handlers: Record<string, (...args: unknown[]) => Promise<void>>
  let closingTimers: Map<string, ReturnType<typeof setTimeout>>
  let gameFacade: IGameFacade

  beforeEach(() => {
    vi.useFakeTimers()
    submitService = makeSubmitService()
    closeService = makeCloseService()
    scoringFacade = makeScoringFacade()
    gameFacade = makeGameFacade()
    socket = makeSocket()
    io = makeIo()
    closingTimers = new Map()
    handlers = captureHandlers(socket)
    vi.mocked(closeService.execute).mockResolvedValue(makeCloseResult())
    vi.mocked(scoringFacade.startAiProcessing).mockResolvedValue()

    registerRoundSocketHandler(
      io as unknown as Server,
      socket,
      submitService,
      closeService,
      scoringFacade,
      closingTimers,
      gameFacade,
      makeLogger(),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    closingTimers.forEach((t) => clearTimeout(t))
  })

  describe('round:submit_answers', () => {
    it('emits round:player_submitted to room on success', async () => {
      vi.mocked(submitService.execute).mockResolvedValue(makeSubmitResult())
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['round:submit_answers']?.({
        roundId: 'round-id-1',
        answers: { 'cat-1': 'Poland' },
      })

      expect(roomEmit).toHaveBeenCalledWith('round:player_submitted', { playerId: 'player-1' })
    })

    it('emits round:closing_started and sets timer on first submit', async () => {
      const deadline = new Date(Date.now() + 15000)
      vi.mocked(submitService.execute).mockResolvedValue(
        makeSubmitResult({ isFirstSubmit: true, closingDeadline: deadline }),
      )
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['round:submit_answers']?.({
        roundId: 'round-id-1',
        answers: {},
      })

      expect(roomEmit).toHaveBeenCalledWith(
        'round:closing_started',
        expect.objectContaining({ deadline: deadline.toISOString() }),
      )
      expect(closingTimers.has('round-id-1')).toBe(true)
    })

    it('does not emit round:closing_started for subsequent submits', async () => {
      vi.mocked(submitService.execute).mockResolvedValue(makeSubmitResult({ isFirstSubmit: false }))
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['round:submit_answers']?.({
        roundId: 'round-id-1',
        answers: {},
      })

      const closingCalls = (roomEmit.mock.calls as unknown[][]).filter(
        (args) => args[0] === 'round:closing_started',
      )
      expect(closingCalls).toHaveLength(0)
    })

    it('cancels timer and emits round:closed when all players submit early', async () => {
      const deadline = new Date(Date.now() + 15000)
      // First submit sets timer
      vi.mocked(submitService.execute).mockResolvedValue(
        makeSubmitResult({ isFirstSubmit: true, closingDeadline: deadline }),
      )
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)
      await handlers['round:submit_answers']?.({ roundId: 'round-id-1', answers: {} })

      // Second submit triggers allSubmitted
      vi.mocked(submitService.execute).mockResolvedValue(
        makeSubmitResult({ isFirstSubmit: false, allSubmitted: true }),
      )
      await handlers['round:submit_answers']?.({ roundId: 'round-id-1', answers: {} })

      expect(closingTimers.has('round-id-1')).toBe(false)
      expect(roomEmit).toHaveBeenCalledWith('round:closed')
      expect(scoringFacade.startAiProcessing).toHaveBeenCalledWith(
        'round-id-1',
        'game-id-1',
        'P',
        expect.any(Array),
      )
    })

    it('closing timer fires: emits round:closed and calls scoringFacade', async () => {
      const deadline = new Date(Date.now() + 15000)
      vi.mocked(submitService.execute).mockResolvedValue(
        makeSubmitResult({ isFirstSubmit: true, closingDeadline: deadline }),
      )
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['round:submit_answers']?.({ roundId: 'round-id-1', answers: {} })

      expect(closingTimers.has('round-id-1')).toBe(true)

      await vi.runAllTimersAsync()

      expect(roomEmit).toHaveBeenCalledWith('round:closed')
      expect(scoringFacade.startAiProcessing).toHaveBeenCalledWith(
        'round-id-1',
        'game-id-1',
        'P',
        expect.any(Array),
      )
      expect(closingTimers.has('round-id-1')).toBe(false)
    })

    it('emits error when payload is invalid', async () => {
      await handlers['round:submit_answers']?.({ invalid: true })
      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Invalid payload.' }),
      )
    })

    it('emits error when not joined to a game room', async () => {
      socket.data = {}
      await handlers['round:submit_answers']?.({ roundId: 'round-id-1', answers: {} })
      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Not joined to a game room.' }),
      )
    })

    it('emits error when submitAnswersService throws InvalidArgumentError', async () => {
      vi.mocked(submitService.execute).mockRejectedValue(
        new InvalidArgumentError('Player already submitted.'),
      )

      await handlers['round:submit_answers']?.({ roundId: 'round-id-1', answers: {} })

      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Player already submitted.' }),
      )
    })

    it('emits error when submitAnswersService throws NotFoundError', async () => {
      vi.mocked(submitService.execute).mockRejectedValue(new NotFoundError('Round not found.'))

      await handlers['round:submit_answers']?.({ roundId: 'round-id-1', answers: {} })

      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Round not found.' }),
      )
    })
  })
})
