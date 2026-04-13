// === src/Game/Domain/ValueObjects/GameIdVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

export class GameIdVo {
  public constructor(public readonly value: string) {
    if (!value) throw new InvalidArgumentError('GameId cannot be empty.')
  }
}
