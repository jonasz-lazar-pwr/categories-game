// === src/Game/Application/ReadDto/GameLobbyDto.ts ===

import type { PlayerInLobbyView } from '#/Game/Application/View/PlayerInLobbyView.js'
import type { CategoryInLobbyView } from '#/Game/Application/View/CategoryInLobbyView.js'
import type { ScoringConfigView } from '#/Game/Application/View/ScoringConfigView.js'

export class GameLobbyDto {
  public constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly status: string,
    public readonly hostPlayerId: string,
    public readonly alphabetPreset: string,
    public readonly roundCount: number,
    public readonly currentRoundNumber: number,
    public readonly players: PlayerInLobbyView[],
    public readonly categories: CategoryInLobbyView[],
    public readonly scoringConfig: ScoringConfigView,
  ) {}
}
