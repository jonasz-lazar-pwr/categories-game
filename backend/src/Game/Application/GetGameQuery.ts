// === src/Game/Application/GetGameQuery.ts ===

import type { GamePublicDto } from '#/Game/Application/ReadDto/GamePublicDto.js'

export interface IGetGameQuery {
  execute(gameId: string): Promise<GamePublicDto | null>
}
