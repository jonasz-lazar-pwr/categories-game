// === src/Identity/Domain/ValueObjects/UserEmailVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class UserEmailVo {
  public constructor(public readonly value: string) {
    if (!value) throw new InvalidArgumentError('Email cannot be empty.')
    if (!EMAIL_REGEX.test(value)) throw new InvalidArgumentError('Email format is invalid.')
  }
}
