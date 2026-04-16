// === src/Scoring/Domain/VerificationAggregate.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { VerificationStatus } from '#/Scoring/Domain/ValueObjects/VerificationStatusVo.js'
import { VerificationIdVo } from '#/Scoring/Domain/ValueObjects/VerificationIdVo.js'
import { AiScoreVo } from '#/Scoring/Domain/ValueObjects/AiScoreVo.js'
import type { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import type { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import type { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'

const AI_ACCEPTANCE_THRESHOLD = 50
const VOTE_ACCEPTANCE_THRESHOLD = 0.5

// === Internal Entities ===

export class Vote {
  public constructor(
    public readonly voterId: PlayerIdVo,
    public readonly accepted: boolean,
  ) {}
}

export class AnswerVerificationItem {
  public constructor(
    public readonly id: string,
    public readonly playerId: PlayerIdVo,
    public readonly categoryId: string,
    public readonly value: string,
    private _aiScore: AiScoreVo | null,
    private _aiReasoning: string | null,
    private _votes: Vote[],
    private _isAccepted: boolean | null,
    private _isResolved: boolean,
  ) {}

  public get aiScore(): AiScoreVo | null {
    return this._aiScore
  }

  public get aiReasoning(): string | null {
    return this._aiReasoning
  }

  public get votes(): readonly Vote[] {
    return this._votes
  }

  public get isAccepted(): boolean | null {
    return this._isAccepted
  }

  public get isResolved(): boolean {
    return this._isResolved
  }

  public get isEmpty(): boolean {
    return this.value.trim() === ''
  }

  public setAiResult(score: AiScoreVo, reasoning: string): void {
    this._aiScore = score
    this._aiReasoning = reasoning
  }

  public addVote(vote: Vote): void {
    this._votes = [...this._votes, vote]
  }

  public resolve(isAccepted: boolean): void {
    this._isAccepted = isAccepted
    this._isResolved = true
  }
}

// === Aggregate Root ===

export class VerificationAggregate {
  private constructor(
    public readonly id: VerificationIdVo,
    public readonly roundId: RoundIdVo,
    public readonly gameId: GameIdVo,
    private _status: VerificationStatus,
    private _cursorPlayerId: PlayerIdVo | null,
    private _cursorCategoryId: string | null,
    private readonly _items: AnswerVerificationItem[],
  ) {}

  // === Factory Methods ===

  public static create(
    id: VerificationIdVo,
    roundId: RoundIdVo,
    gameId: GameIdVo,
    answers: Array<{ playerId: PlayerIdVo; categoryId: string; value: string }>,
    itemIdGenerator: () => string,
  ): VerificationAggregate {
    const items = answers.map((a) => {
      const isEmpty = a.value.trim() === ''
      return new AnswerVerificationItem(
        itemIdGenerator(),
        a.playerId,
        a.categoryId,
        a.value,
        isEmpty ? new AiScoreVo(0) : null,
        null,
        [],
        null,
        false,
      )
    })
    return new VerificationAggregate(
      id,
      roundId,
      gameId,
      VerificationStatus.ai_processing,
      null,
      null,
      items,
    )
  }

  public static restore(
    id: VerificationIdVo,
    roundId: RoundIdVo,
    gameId: GameIdVo,
    status: VerificationStatus,
    cursorPlayerId: PlayerIdVo | null,
    cursorCategoryId: string | null,
    items: AnswerVerificationItem[],
  ): VerificationAggregate {
    return new VerificationAggregate(
      id,
      roundId,
      gameId,
      status,
      cursorPlayerId,
      cursorCategoryId,
      items,
    )
  }

  // === Getters ===

  public get status(): VerificationStatus {
    return this._status
  }

  public get cursorPlayerId(): PlayerIdVo | null {
    return this._cursorPlayerId
  }

  public get cursorCategoryId(): string | null {
    return this._cursorCategoryId
  }

  public get items(): readonly AnswerVerificationItem[] {
    return this._items
  }

  // === Public Methods ===

  public setAiResult(
    playerId: PlayerIdVo,
    categoryId: string,
    score: AiScoreVo,
    reasoning: string,
  ): void {
    const item = this.findItem(playerId.value, categoryId)
    if (item === undefined) {
      throw new InvalidArgumentError('Answer verification item not found.')
    }
    item.setAiResult(score, reasoning)

    const allNonEmptyHaveScores = this._items
      .filter((i) => !i.isEmpty)
      .every((i) => i.aiScore !== null)

    if (allNonEmptyHaveScores && this._status === VerificationStatus.ai_processing) {
      this._status = VerificationStatus.in_progress
      const firstItem = this._items[0]
      if (firstItem !== undefined) {
        this._cursorPlayerId = firstItem.playerId
        this._cursorCategoryId = firstItem.categoryId
      }
    }
  }

  public castVote(
    voterId: PlayerIdVo,
    playerId: PlayerIdVo,
    categoryId: string,
    accepted: boolean,
  ): void {
    if (this._status !== VerificationStatus.in_progress) {
      throw new InvalidArgumentError('Voting is only allowed during verification.')
    }
    if (voterId.value === playerId.value) {
      throw new InvalidArgumentError('A player cannot vote on their own answer.')
    }
    const item = this.findItem(playerId.value, categoryId)
    if (item === undefined) {
      throw new InvalidArgumentError('Answer verification item not found.')
    }
    if (item.isResolved) {
      throw new InvalidArgumentError('This answer has already been resolved.')
    }
    item.addVote(new Vote(voterId, accepted))
  }

  public resolveItem(playerId: PlayerIdVo, categoryId: string): void {
    const item = this.findItem(playerId.value, categoryId)
    if (item === undefined) {
      throw new InvalidArgumentError('Answer verification item not found.')
    }
    if (item.isResolved) return

    if (item.isEmpty) {
      item.resolve(false)
      return
    }

    const aiAccepted = (item.aiScore?.value ?? 0) >= AI_ACCEPTANCE_THRESHOLD
    const playerVotes = item.votes
    const acceptedVotes = playerVotes.filter((v) => v.accepted).length + (aiAccepted ? 1 : 0)
    const totalVotes = playerVotes.length + 1 // +1 for AI

    item.resolve(acceptedVotes / totalVotes >= VOTE_ACCEPTANCE_THRESHOLD)
  }

  public advanceCursor(): void {
    if (this._cursorPlayerId !== null && this._cursorCategoryId !== null) {
      this.resolveItem(this._cursorPlayerId, this._cursorCategoryId)
    }

    const nextItem = this._items.find((i) => !i.isResolved)

    if (nextItem !== undefined) {
      this._cursorPlayerId = nextItem.playerId
      this._cursorCategoryId = nextItem.categoryId
    } else {
      this._status = VerificationStatus.finished
      this._cursorPlayerId = null
      this._cursorCategoryId = null
    }
  }

  public resolveAll(): void {
    for (const item of this._items) {
      if (!item.isResolved) {
        this.resolveItem(item.playerId, item.categoryId)
      }
    }
    this._status = VerificationStatus.finished
    this._cursorPlayerId = null
    this._cursorCategoryId = null
  }

  public computeScores(config: {
    uniqueOnlyPoints: number
    uniquePoints: number
    duplicatePoints: number
  }): Map<string, number> {
    const scores = new Map<string, number>()

    // Initialise all players with zero
    for (const item of this._items) {
      if (!scores.has(item.playerId.value)) {
        scores.set(item.playerId.value, 0)
      }
    }

    // Group accepted items by categoryId
    const acceptedByCategoryId = new Map<string, AnswerVerificationItem[]>()
    for (const item of this._items) {
      if (item.isAccepted !== true) continue
      const existing = acceptedByCategoryId.get(item.categoryId) ?? []
      existing.push(item)
      acceptedByCategoryId.set(item.categoryId, existing)
    }

    for (const acceptedItems of acceptedByCategoryId.values()) {
      const acceptedCount = acceptedItems.length

      // Build a group-by-value map (case-insensitive, trimmed) in O(n)
      const countByValue = new Map<string, number>()
      for (const item of acceptedItems) {
        const key = item.value.trim().toLowerCase()
        countByValue.set(key, (countByValue.get(key) ?? 0) + 1)
      }

      for (const item of acceptedItems) {
        const sharesCount = countByValue.get(item.value.trim().toLowerCase()) ?? 1

        let points: number
        if (sharesCount >= 2) {
          points = config.duplicatePoints
        } else if (acceptedCount === 1) {
          points = config.uniqueOnlyPoints
        } else {
          points = config.uniquePoints
        }

        const current = scores.get(item.playerId.value) ?? 0
        scores.set(item.playerId.value, current + points)
      }
    }

    return scores
  }

  // === Private Helpers ===

  private findItem(playerIdValue: string, categoryId: string): AnswerVerificationItem | undefined {
    return this._items.find(
      (i) => i.playerId.value === playerIdValue && i.categoryId === categoryId,
    )
  }
}
