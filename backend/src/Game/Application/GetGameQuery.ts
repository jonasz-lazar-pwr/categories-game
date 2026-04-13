// === src/Game/Application/GetGameQuery.ts ===

import type { GameLobbyDto } from '#/Game/Application/ReadDto/GameLobbyDto.js'

export interface IGetGameQuery {
  execute(gameId: string): Promise<GameLobbyDto | null>
}
