// === src/shared/errors/ConflictError.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

export class ConflictError extends InvalidArgumentError {
  public constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}
