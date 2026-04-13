// === src/Game/Domain/ValueObjects/GameCodeVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

const GAME_CODE_PATTERN = /^[A-Z0-9]{6}$/

export class GameCodeVo {
  public constructor(public readonly value: string) {
    if (!GAME_CODE_PATTERN.test(value)) {
      throw new InvalidArgumentError(
        'Game code must be exactly 6 uppercase alphanumeric characters.',
      )
    }
  }
}
