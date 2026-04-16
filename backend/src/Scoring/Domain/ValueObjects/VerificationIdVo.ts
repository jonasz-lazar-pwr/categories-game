// === src/Scoring/Domain/ValueObjects/VerificationIdVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

export class VerificationIdVo {
  public constructor(public readonly value: string) {
    if (!value) throw new InvalidArgumentError('VerificationId cannot be empty.')
  }
}
