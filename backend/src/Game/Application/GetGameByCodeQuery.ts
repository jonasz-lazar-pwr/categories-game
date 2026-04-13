// === src/Game/Application/GetGameByCodeQuery.ts ===

import type { GameLobbyDto } from '#/Game/Application/ReadDto/GameLobbyDto.js'

export interface IGetGameByCodeQuery {
  execute(code: string): Promise<GameLobbyDto | null>
}
