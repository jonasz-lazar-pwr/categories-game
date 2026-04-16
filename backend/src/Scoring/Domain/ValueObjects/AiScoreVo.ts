// === src/Scoring/Domain/ValueObjects/AiScoreVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

const MIN_SCORE = 0
const MAX_SCORE = 100

export class AiScoreVo {
  public constructor(public readonly value: number) {
    if (!Number.isInteger(value) || value < MIN_SCORE || value > MAX_SCORE) {
      throw new InvalidArgumentError(
        `AiScore must be an integer between ${MIN_SCORE} and ${MAX_SCORE}.`,
      )
    }
  }
}
