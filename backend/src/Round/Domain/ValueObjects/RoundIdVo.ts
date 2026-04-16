// === src/Round/Domain/ValueObjects/RoundIdVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

export class RoundIdVo {
  public constructor(public readonly value: string) {
    if (!value) throw new InvalidArgumentError('RoundId cannot be empty.')
  }
}
