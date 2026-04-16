// === src/Game/Domain/GameFacade.ts ===

import type { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import type { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'

export interface IGameCategoryDto {
  categoryId: string
  name: string
  description: string
}

export interface IGamePlayerDto {
  playerId: string
  nick: string
  score: number
  isConnected: boolean
}

export interface IGameStateDto {
  currentRoundNumber: number
  roundCount: number
  scoringConfig: {
    uniqueOnlyPoints: number
    uniquePoints: number
    duplicatePoints: number
    closingTimeSeconds: number
    verificationTimeoutSeconds: number
  }
  categories: IGameCategoryDto[]
  players: IGamePlayerDto[]
}

export interface IGameScoringConfigDto {
  uniqueOnlyPoints: number
  uniquePoints: number
  duplicatePoints: number
  closingTimeSeconds: number
  verificationTimeoutSeconds: number
}

export interface IGameConfigurationDto {
  roundNumber: number
  letter: string
  categories: IGameCategoryDto[]
  players: IGamePlayerDto[]
  scoringConfig: IGameScoringConfigDto
}

export interface IGameFacade {
  startRound(gameId: GameIdVo): Promise<IGameConfigurationDto>
  updatePlayerScore(gameId: GameIdVo, playerId: PlayerIdVo, points: number): Promise<void>
  updatePlayerScores(gameId: GameIdVo, scores: Map<PlayerIdVo, number>): Promise<void>
  finishGame(gameId: GameIdVo): Promise<void>
  getGameState(gameId: GameIdVo): Promise<IGameStateDto>
}
