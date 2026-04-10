// === src/Identity/Domain/ValueObjects/UserPasswordHashVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

export class UserPasswordHashVo {
  public constructor(public readonly value: string) {
    if (!value) throw new InvalidArgumentError('Password hash cannot be empty.')
  }
}
