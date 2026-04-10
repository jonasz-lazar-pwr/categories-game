// === src/Identity/Domain/ValueObjects/UserIdVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

export class UserIdVo {
  public constructor(public readonly value: string) {
    if (!value) throw new InvalidArgumentError('UserId cannot be empty.')
  }
}
