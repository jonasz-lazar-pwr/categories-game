// === src/Game/Domain/ValueObjects/RoundCountVo.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

const MIN_ROUNDS = 1
const MAX_ROUNDS = 26

export class RoundCountVo {
  public constructor(public readonly value: number) {
    if (!Number.isInteger(value) || value < MIN_ROUNDS || value > MAX_ROUNDS) {
      throw new InvalidArgumentError(
        `Round count must be an integer between ${MIN_ROUNDS} and ${MAX_ROUNDS}.`,
      )
    }
  }
}
