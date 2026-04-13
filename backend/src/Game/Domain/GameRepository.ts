// === src/Game/Domain/GameRepository.ts ===

import type { GameAggregate } from '#/Game/Domain/GameAggregate.js'
import type { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import type { GameCodeVo } from '#/Game/Domain/ValueObjects/GameCodeVo.js'

export interface IGameRepository {
  findById(id: GameIdVo): Promise<GameAggregate | null>
  findByCode(code: GameCodeVo): Promise<GameAggregate | null>
  save(game: GameAggregate): Promise<void>
}
