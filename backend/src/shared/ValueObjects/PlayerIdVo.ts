// === src/shared/ValueObjects/PlayerIdVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

export class PlayerIdVo {
  public constructor(public readonly value: string) {
    if (!value) throw new InvalidArgumentError('PlayerId cannot be empty.')
  }
}
