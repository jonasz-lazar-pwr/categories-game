// === src/Round/Domain/RoundAggregate.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { RoundStatus } from '#/Round/Domain/ValueObjects/RoundStatusVo.js'
import type { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import type { RoundLetterVo } from '#/Round/Domain/ValueObjects/RoundLetterVo.js'
import type { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import type { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'

export class PlayerAnswers {
  public constructor(
    public readonly playerId: PlayerIdVo,
    private _answers: Map<string, string>,
    private _submittedAt: Date | null,
  ) {}

  public get answers(): ReadonlyMap<string, string> {
    return this._answers
  }

  public get submittedAt(): Date | null {
    return this._submittedAt
  }

  public submit(answers: Map<string, string>, submittedAt: Date): void {
    this._answers = answers
    this._submittedAt = submittedAt
  }
}

export class RoundAggregate {
  // === Constructor ===

  private constructor(
    public readonly id: RoundIdVo,
    public readonly gameId: GameIdVo,
    public readonly roundNumber: number,
    public readonly letter: RoundLetterVo,
    private _status: RoundStatus,
    private _closingDeadline: Date | null,
    private readonly _playerAnswers: PlayerAnswers[],
  ) {}

  // === Public Methods ===

  public static create(
    id: RoundIdVo,
    gameId: GameIdVo,
    roundNumber: number,
    letter: RoundLetterVo,
    playerIds: PlayerIdVo[],
  ): RoundAggregate {
    const playerAnswers = playerIds.map(
      (pid) => new PlayerAnswers(pid, new Map<string, string>(), null),
    )
    return new RoundAggregate(
      id,
      gameId,
      roundNumber,
      letter,
      RoundStatus.answering,
      null,
      playerAnswers,
    )
  }

  public static restore(
    id: RoundIdVo,
    gameId: GameIdVo,
    roundNumber: number,
    letter: RoundLetterVo,
    status: RoundStatus,
    closingDeadline: Date | null,
    playerAnswers: PlayerAnswers[],
  ): RoundAggregate {
    return new RoundAggregate(
      id,
      gameId,
      roundNumber,
      letter,
      status,
      closingDeadline,
      playerAnswers,
    )
  }

  public get status(): RoundStatus {
    return this._status
  }

  public get closingDeadline(): Date | null {
    return this._closingDeadline
  }

  public submitAnswers(playerId: PlayerIdVo, answers: Map<string, string>): void {
    if (this._status === RoundStatus.finished) {
      throw new InvalidArgumentError('Cannot submit answers after the round has finished.')
    }

    const entry = this._playerAnswers.find((pa) => pa.playerId.value === playerId.value)
    if (entry === undefined) {
      throw new InvalidArgumentError('Player is not part of this round.')
    }
    if (entry.submittedAt !== null) {
      throw new InvalidArgumentError('Player has already submitted answers.')
    }

    entry.submit(answers, new Date())
  }

  public startClosing(deadline: Date): void {
    if (this._status !== RoundStatus.answering) {
      throw new InvalidArgumentError('Round closing can only be started from the answering phase.')
    }
    this._closingDeadline = deadline
    this._status = RoundStatus.closing
  }

  public close(): void {
    if (this._status === RoundStatus.finished) {
      throw new InvalidArgumentError('Round is already finished.')
    }
    this._status = RoundStatus.finished
  }

  public hasAllSubmitted(): boolean {
    return this._playerAnswers.every((pa) => pa.submittedAt !== null)
  }

  public getSubmittedAnswers(): readonly PlayerAnswers[] {
    return this._playerAnswers
  }
}
