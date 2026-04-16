// === src/Presentation/Game/__tests__/gameSocketHandler.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerGameSocketHandler } from '#/Presentation/Game/gameSocketHandler.js'
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
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'
import type { IStartGameService } from '#/Game/Application/StartGameService.js'
import type { ICancelGameService } from '#/Game/Application/CancelGameService.js'
import type { ICancelGameAfterTimeoutService } from '#/Game/Application/CancelGameAfterTimeoutService.js'
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

const makeGameRepo = (): IGameRepository => ({
  findById: vi.fn(),
  findByCode: vi.fn(),
  save: vi.fn(),
})

const makeStartGameService = (): IStartGameService => ({
  execute: vi.fn(),
})

const makeCancelGameService = (): ICancelGameService => ({
  execute: vi.fn(),
})

const makeCancelGameAfterTimeoutService = (): ICancelGameAfterTimeoutService => ({
  execute: vi.fn(),
})

const makeGameFacade = (): IGameFacade => ({
  startRound: vi.fn(),
  updatePlayerScore: vi.fn(),
  updatePlayerScores: vi.fn(),
  finishGame: vi.fn(),
  getGameState: vi.fn(),
})

const makeSocket = (): Socket => {
  const emitFn = vi.fn()
  const joinFn = vi.fn().mockResolvedValue(undefined)
  return {
    id: 'socket-id-1',
    data: {},
    emit: emitFn,
    join: joinFn,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      // Store handlers for manual invocation in tests
      ;(makeSocket as unknown as Record<string, unknown>)[`_handler_${event}`] = handler
    }),
  } as unknown as Socket
}

const makeIo = () => ({
  to: vi.fn().mockReturnValue({ emit: vi.fn() }),
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

describe('gameSocketHandler', () => {
  let gameRepo: IGameRepository
  let startGameService: IStartGameService
  let cancelGameService: ICancelGameService
  let cancelGameAfterTimeoutService: ICancelGameAfterTimeoutService
  let gameFacade: IGameFacade
  let socket: Socket
  let io: ReturnType<typeof makeIo>
  let handlers: Record<string, (...args: unknown[]) => Promise<void>>

  beforeEach(() => {
    gameRepo = makeGameRepo()
    startGameService = makeStartGameService()
    cancelGameService = makeCancelGameService()
    cancelGameAfterTimeoutService = makeCancelGameAfterTimeoutService()
    gameFacade = makeGameFacade()
    socket = makeSocket()
    io = makeIo()
    handlers = captureHandlers(socket)
    vi.mocked(gameRepo.save).mockResolvedValue()
    vi.mocked(startGameService.execute).mockResolvedValue()
    vi.mocked(cancelGameService.execute).mockResolvedValue()
    vi.mocked(gameFacade.finishGame).mockResolvedValue()
    registerGameSocketHandler(
      io as unknown as Server,
      socket,
      gameRepo,
      startGameService,
      cancelGameService,
      cancelGameAfterTimeoutService,
      gameFacade,
      vi.fn().mockResolvedValue(undefined),
      makeLogger(),
    )
  })

  describe('game:join_room', () => {
    it('emits game:player_joined on first join (socketId was null)', async () => {
      const game = makeLobbyGame()
      vi.mocked(gameRepo.findById).mockResolvedValue(game)
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['game:join_room']?.({ gameId: 'game-id-1', playerId: 'host-player-id' })

      expect(roomEmit).toHaveBeenCalledWith(
        'game:player_joined',
        expect.objectContaining({ playerId: 'host-player-id' }),
      )
    })

    it('emits game:host_reconnected on reconnect for host (socketId was not null)', async () => {
      const game = makeLobbyGame()
      game.setPlayerConnected(new PlayerIdVo('host-player-id'), 'old-socket', true)
      vi.mocked(gameRepo.findById).mockResolvedValue(game)
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['game:join_room']?.({ gameId: 'game-id-1', playerId: 'host-player-id' })

      expect(roomEmit).toHaveBeenCalledWith('game:host_reconnected')
    })

    it('emits error when game not found', async () => {
      vi.mocked(gameRepo.findById).mockResolvedValue(null)
      await handlers['game:join_room']?.({ gameId: 'game-id-1', playerId: 'host-player-id' })
      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.any(String) }),
      )
    })

    it('emits error when payload is invalid', async () => {
      await handlers['game:join_room']?.({ invalid: true })
      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Invalid payload.' }),
      )
    })
  })

  describe('game:start', () => {
    it('emits game:started to room on success', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'host-player-id', isHost: true }
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['game:start']?.()

      expect(vi.mocked(startGameService.execute)).toHaveBeenCalledOnce()
      expect(roomEmit).toHaveBeenCalledWith('game:started')
    })

    it('emits error to socket when StartGameService throws InvalidArgumentError', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'not-host', isHost: false }
      vi.mocked(startGameService.execute).mockRejectedValue(
        new InvalidArgumentError('Only the host can start the game.'),
      )

      await handlers['game:start']?.()

      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: expect.any(String) }),
      )
    })

    it('emits error when not joined to a game room', async () => {
      socket.data = {}

      await handlers['game:start']?.()

      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Not joined to a game room.' }),
      )
    })
  })

  describe('game:cancel_by_player', () => {
    it('emits game:cancelled to room on success', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'host-player-id', isHost: true }
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['game:cancel_by_player']?.()

      expect(vi.mocked(cancelGameService.execute)).toHaveBeenCalledOnce()
      expect(roomEmit).toHaveBeenCalledWith('game:cancelled')
    })

    it('emits error when CancelGameService throws NotFoundError', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'host-player-id', isHost: true }
      vi.mocked(cancelGameService.execute).mockRejectedValue(new NotFoundError('Game not found.'))

      await handlers['game:cancel_by_player']?.()

      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Game not found.' }),
      )
    })

    it('emits error when CancelGameService throws InvalidArgumentError', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'not-the-host', isHost: false }
      vi.mocked(cancelGameService.execute).mockRejectedValue(
        new InvalidArgumentError('Only the host can cancel the game.'),
      )

      await handlers['game:cancel_by_player']?.()

      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Only the host can cancel the game.' }),
      )
    })

    it('emits error when not joined to a game room', async () => {
      socket.data = {}

      await handlers['game:cancel_by_player']?.()

      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Not joined to a game room.' }),
      )
    })
  })

  describe('game:next_round', () => {
    it('emits error when not joined to a game room', async () => {
      socket.data = {}
      await handlers['game:next_round']?.()
      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Not joined to a game room.' }),
      )
    })

    it('emits error when caller is not the host', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'player-2', isHost: false }
      await handlers['game:next_round']?.()
      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Only the host can start the next round.' }),
      )
    })

    it('calls onGameStarted when host triggers next round', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'host-player-id', isHost: true }
      const game = makeLobbyGame()
      vi.mocked(gameRepo.findById).mockResolvedValue(game)
      const onGameStarted = vi.fn().mockResolvedValue(undefined)
      registerGameSocketHandler(
        io as unknown as Server,
        socket,
        gameRepo,
        startGameService,
        cancelGameService,
        cancelGameAfterTimeoutService,
        gameFacade,
        onGameStarted,
        makeLogger(),
      )
      const freshHandlers = captureHandlers(socket)
      registerGameSocketHandler(
        io as unknown as Server,
        socket,
        gameRepo,
        startGameService,
        cancelGameService,
        cancelGameAfterTimeoutService,
        gameFacade,
        onGameStarted,
        makeLogger(),
      )
      await freshHandlers['game:next_round']?.()
      expect(onGameStarted).toHaveBeenCalledWith('game-id-1')
    })
  })

  describe('game:end', () => {
    it('emits error when not joined to a game room', async () => {
      socket.data = {}
      await handlers['game:end']?.()
      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Not joined to a game room.' }),
      )
    })

    it('emits error when caller is not the host', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'player-2', isHost: false }
      await handlers['game:end']?.()
      expect(vi.mocked(socket.emit)).toHaveBeenCalledWith(
        'error',
        expect.objectContaining({ message: 'Only the host can end the game.' }),
      )
    })

    it('calls gameFacade.finishGame and emits game:finished', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'host-player-id', isHost: true }
      const game = makeLobbyGame()
      vi.mocked(gameRepo.findById).mockResolvedValue(game)
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['game:end']?.()

      expect(vi.mocked(gameFacade.finishGame)).toHaveBeenCalledOnce()
      expect(roomEmit).toHaveBeenCalledWith('game:finished')
    })
  })

  describe('disconnect', () => {
    it('emits game:host_disconnected with timeoutSeconds when host disconnects', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'host-player-id', isHost: true }
      const game = makeLobbyGame()
      vi.mocked(gameRepo.findById).mockResolvedValue(game)
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['disconnect']?.()

      expect(roomEmit).toHaveBeenCalledWith('game:host_disconnected', { timeoutSeconds: 60 })
    })

    it('emits game:player_disconnected when non-host player disconnects', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'host-player-id', isHost: false }
      const game = makeLobbyGame()
      vi.mocked(gameRepo.findById).mockResolvedValue(game)
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['disconnect']?.()

      expect(roomEmit).toHaveBeenCalledWith('game:player_disconnected', {
        playerId: 'host-player-id',
      })
    })

    it('emits game:cancelled when last non-host player disconnects', async () => {
      socket.data = { gameId: 'game-id-1', playerId: 'host-player-id', isHost: false }
      const game = makeLobbyGame()
      vi.mocked(gameRepo.findById).mockResolvedValue(game)
      const roomEmit = vi.fn()
      vi.mocked(io.to).mockReturnValue({ emit: roomEmit } as unknown as ReturnType<typeof io.to>)

      await handlers['disconnect']?.()

      expect(roomEmit).toHaveBeenCalledWith('game:cancelled')
    })

    it('does nothing when socket.data has no gameId', async () => {
      socket.data = {}
      await handlers['disconnect']?.()
      expect(vi.mocked(gameRepo.findById)).not.toHaveBeenCalled()
    })
  })
})
