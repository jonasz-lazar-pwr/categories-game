// === src/Game/Domain/GameAggregate.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import { PlayerEntry } from '#/Game/Domain/Entities/PlayerEntry.js'
import type { CategoryConfig } from '#/Game/Domain/Entities/CategoryConfig.js'
import type { ScoringConfig } from '#/Game/Domain/Entities/ScoringConfig.js'
import { GameStatus } from '#/Game/Domain/ValueObjects/GameStatusVo.js'
import { ALPHABET_LETTERS } from '#/Game/Domain/ValueObjects/AlphabetPresetVo.js'
import type { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import type { GameCodeVo } from '#/Game/Domain/ValueObjects/GameCodeVo.js'
import type { AlphabetPreset } from '#/Game/Domain/ValueObjects/AlphabetPresetVo.js'
import type { RoundCountVo } from '#/Game/Domain/ValueObjects/RoundCountVo.js'
import type { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import type { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'

const MAX_PLAYERS = 20

export interface CreateGameConfig {
  alphabetPreset: AlphabetPreset
  roundCount: RoundCountVo
  categories: CategoryConfig[]
  scoringConfig: ScoringConfig
}

export class GameAggregate {
  // === Constants ===

  private static readonly MAX_PLAYERS = MAX_PLAYERS

  // === Properties ===

  private readonly _players: PlayerEntry[]

  // === Constructor ===

  private constructor(
    public readonly id: GameIdVo,
    public readonly code: GameCodeVo,
    private _status: GameStatus,
    public readonly hostId: PlayerIdVo,
    public readonly alphabetPreset: AlphabetPreset,
    public readonly roundCount: RoundCountVo,
    private readonly _usedLetters: string[],
    private _currentRoundNumber: number,
    players: PlayerEntry[],
    public readonly categories: readonly CategoryConfig[],
    public readonly scoringConfig: ScoringConfig,
  ) {
    this._players = players
  }

  // === Public Methods ===

  public static create(
    id: GameIdVo,
    code: GameCodeVo,
    hostPlayerId: PlayerIdVo,
    hostUserId: UserIdVo,
    hostNick: string,
    config: CreateGameConfig,
  ): GameAggregate {
    const hostEntry = new PlayerEntry(hostPlayerId, hostUserId, hostNick, true, false, null, 0)
    return new GameAggregate(
      id,
      code,
      GameStatus.lobby,
      hostPlayerId,
      config.alphabetPreset,
      config.roundCount,
      [],
      0,
      [hostEntry],
      config.categories,
      config.scoringConfig,
    )
  }

  public static restore(
    id: GameIdVo,
    code: GameCodeVo,
    status: GameStatus,
    hostId: PlayerIdVo,
    alphabetPreset: AlphabetPreset,
    roundCount: RoundCountVo,
    usedLetters: string[],
    currentRoundNumber: number,
    players: PlayerEntry[],
    categories: CategoryConfig[],
    scoringConfig: ScoringConfig,
  ): GameAggregate {
    return new GameAggregate(
      id,
      code,
      status,
      hostId,
      alphabetPreset,
      roundCount,
      usedLetters,
      currentRoundNumber,
      players,
      categories,
      scoringConfig,
    )
  }

  public get status(): GameStatus {
    return this._status
  }

  public get usedLetters(): readonly string[] {
    return this._usedLetters
  }

  public get currentRoundNumber(): number {
    return this._currentRoundNumber
  }

  public get players(): readonly PlayerEntry[] {
    return this._players
  }

  public addPlayer(playerId: PlayerIdVo, userId: UserIdVo | null, nick: string): void {
    if (this._status !== GameStatus.lobby) {
      throw new InvalidArgumentError('Players can only join before the game starts.')
    }
    if (this._players.length >= GameAggregate.MAX_PLAYERS) {
      throw new InvalidArgumentError(
        `Game is full. Maximum ${GameAggregate.MAX_PLAYERS} players allowed.`,
      )
    }
    const nickTaken = this._players.some((p) => p.nick.toLowerCase() === nick.toLowerCase())
    if (nickTaken) {
      throw new InvalidArgumentError('Nickname is already taken in this game.')
    }
    this._players.push(new PlayerEntry(playerId, userId, nick, false, false, null, 0))
  }

  public start(): void {
    if (this._status !== GameStatus.lobby) {
      throw new InvalidArgumentError('Game can only be started from the lobby.')
    }
    this._status = GameStatus.active
  }

  public cancel(): void {
    if (this._status !== GameStatus.lobby && this._status !== GameStatus.active) {
      throw new InvalidArgumentError('Game can only be cancelled from lobby or active status.')
    }
    this._status = GameStatus.cancelled
  }

  public drawLetter(): string {
    const available = ALPHABET_LETTERS[this.alphabetPreset].filter(
      (letter) => !this._usedLetters.includes(letter),
    )
    if (available.length === 0) {
      throw new InvalidArgumentError('No letters remaining in the alphabet for this game.')
    }
    const index = Math.floor(Math.random() * available.length)
    const letter = available[index]
    if (letter === undefined) {
      throw new InvalidArgumentError('No letters remaining in the alphabet for this game.')
    }
    this._usedLetters.push(letter)
    return letter
  }

  public advanceRound(): void {
    this._currentRoundNumber += 1
  }

  public finish(): void {
    if (this._status !== GameStatus.active) {
      throw new InvalidArgumentError('Game can only be finished from active status.')
    }
    this._status = GameStatus.finished
  }

  public updatePlayerScore(playerId: PlayerIdVo, points: number): void {
    const player = this.findPlayer(playerId)
    player.addScore(points)
  }

  public setPlayerConnected(
    playerId: PlayerIdVo,
    socketId: string | null,
    isConnected: boolean,
  ): void {
    const player = this.findPlayer(playerId)
    player.setConnected(socketId, isConnected)
  }

  // === Private Helpers ===

  private findPlayer(playerId: PlayerIdVo): PlayerEntry {
    const player = this._players.find((p) => p.playerId.value === playerId.value)
    if (player === undefined) {
      throw new NotFoundError(`Player ${playerId.value} not found in game.`)
    }
    return player
  }
}
