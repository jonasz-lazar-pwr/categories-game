// === src/Identity/Domain/ValueObjects/UserNickVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

const NICK_REGEX = /^[a-zA-Z0-9_]+$/
const MIN_LENGTH = 3
const MAX_LENGTH = 20

export class UserNickVo {
  public constructor(public readonly value: string) {
    if (!value) throw new InvalidArgumentError('Nick cannot be empty.')
    if (value.length < MIN_LENGTH)
      throw new InvalidArgumentError(`Nick must be at least ${MIN_LENGTH} characters.`)
    if (value.length > MAX_LENGTH)
      throw new InvalidArgumentError(`Nick must be at most ${MAX_LENGTH} characters.`)
    if (!NICK_REGEX.test(value))
      throw new InvalidArgumentError('Nick may only contain letters, digits, and underscores.')
  }
}
