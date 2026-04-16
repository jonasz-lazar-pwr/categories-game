// === src/Scoring/Application/AdvanceCursorService.ts ===

import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { VerificationIdVo } from '#/Scoring/Domain/ValueObjects/VerificationIdVo.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IVerificationRepository } from '#/Scoring/Domain/VerificationRepository.js'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'

export interface IResolvedItemInfo {
  playerId: string
  categoryId: string
  isAccepted: boolean
}

export interface IAdvanceCursorResult {
  gameId: string
  resolved: IResolvedItemInfo
  isFinished: boolean
  nextItem: {
    playerId: string
    categoryId: string
    value: string
    aiScore: number
    aiReasoning: string | null
  } | null
  roundScores: Record<string, number> | null
  standings: Array<{ playerId: string; nick: string; score: number }> | null
  isLastRound: boolean
}

export interface IAdvanceCursorService {
  execute(command: { verificationId: string }): Promise<IAdvanceCursorResult>
}

export class AdvanceCursorService implements IAdvanceCursorService {
  public constructor(
    private readonly verificationRepository: IVerificationRepository,
    private readonly gameFacade: IGameFacade,
  ) {}

  public async execute(command: { verificationId: string }): Promise<IAdvanceCursorResult> {
    const verification = await this.verificationRepository.findById(
      new VerificationIdVo(command.verificationId),
    )
    if (verification === null) throw new NotFoundError('Verification not found.')

    const gameId = verification.gameId.value

    const prevPlayerId = verification.cursorPlayerId
    const prevCategoryId = verification.cursorCategoryId

    verification.advanceCursor()
    await this.verificationRepository.save(verification)

    const resolvedItem =
      prevPlayerId !== null && prevCategoryId !== null
        ? verification.items.find(
            (i) => i.playerId.value === prevPlayerId.value && i.categoryId === prevCategoryId,
          )
        : undefined

    const resolved: IResolvedItemInfo = {
      playerId: prevPlayerId?.value ?? '',
      categoryId: prevCategoryId ?? '',
      isAccepted: resolvedItem?.isAccepted ?? false,
    }

    const isFinished = verification.status === 'finished'

    if (!isFinished) {
      const cursorPlayerId = verification.cursorPlayerId
      const cursorCategoryId = verification.cursorCategoryId
      const nextRaw =
        cursorPlayerId !== null && cursorCategoryId !== null
          ? verification.items.find(
              (i) => i.playerId.value === cursorPlayerId.value && i.categoryId === cursorCategoryId,
            )
          : undefined

      return {
        gameId,
        resolved,
        isFinished: false,
        nextItem:
          nextRaw !== undefined
            ? {
                playerId: nextRaw.playerId.value,
                categoryId: nextRaw.categoryId,
                value: nextRaw.value,
                aiScore: nextRaw.aiScore?.value ?? 0,
                aiReasoning: nextRaw.aiReasoning,
              }
            : null,
        roundScores: null,
        standings: null,
        isLastRound: false,
      }
    }

    // Verification is finished — compute and apply scores atomically
    const gameState = await this.gameFacade.getGameState(new GameIdVo(gameId))
    const scoreMap = verification.computeScores(gameState.scoringConfig)

    const playerScores = new Map<PlayerIdVo, number>()
    for (const [playerId, points] of scoreMap.entries()) {
      if (points > 0) {
        playerScores.set(new PlayerIdVo(playerId), points)
      }
    }
    if (playerScores.size > 0) {
      await this.gameFacade.updatePlayerScores(new GameIdVo(gameId), playerScores)
    }

    const isLastRound = gameState.currentRoundNumber >= gameState.roundCount

    if (isLastRound) {
      await this.gameFacade.finishGame(new GameIdVo(gameId))
    }

    const freshState = await this.gameFacade.getGameState(new GameIdVo(gameId))

    const roundScores: Record<string, number> = {}
    for (const [playerId, points] of scoreMap.entries()) {
      roundScores[playerId] = points
    }

    const standings = freshState.players.map((p) => ({
      playerId: p.playerId,
      nick: p.nick,
      score: p.score,
    }))

    return {
      gameId,
      resolved,
      isFinished: true,
      nextItem: null,
      roundScores,
      standings,
      isLastRound,
    }
  }
}
