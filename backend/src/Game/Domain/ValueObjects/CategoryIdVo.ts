// === src/Game/Domain/ValueObjects/CategoryIdVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

export class CategoryIdVo {
  public constructor(public readonly value: string) {
    if (!value) throw new InvalidArgumentError('CategoryId cannot be empty.')
  }
}
