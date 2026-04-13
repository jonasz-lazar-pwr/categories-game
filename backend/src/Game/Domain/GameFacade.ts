// === src/Game/Domain/GameFacade.ts ===

import type { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'

export interface GameCategoryDto {
  categoryId: string
  name: string
  description: string
}

export interface GamePlayerDto {
  playerId: string
  nick: string
}

export interface GameScoringConfigDto {
  uniqueOnlyPoints: number
  uniquePoints: number
  duplicatePoints: number
  closingTimeSeconds: number
  verificationTimeoutSeconds: number
}

export interface GameConfigurationDto {
  letter: string
  categories: GameCategoryDto[]
  players: GamePlayerDto[]
  scoringConfig: GameScoringConfigDto
}

export interface IGameFacade {
  startRound(gameId: GameIdVo): Promise<GameConfigurationDto>
}
