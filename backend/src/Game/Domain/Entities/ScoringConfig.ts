// === src/Game/Domain/Entities/ScoringConfig.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

export class ScoringConfig {
  public constructor(
    public readonly uniqueOnlyPoints: number,
    public readonly uniquePoints: number,
    public readonly duplicatePoints: number,
    public readonly closingTimeSeconds: number,
    public readonly verificationTimeoutSeconds: number,
    public readonly waitingForHostTimeoutSeconds: number,
  ) {
    if (
      !Number.isInteger(uniqueOnlyPoints) ||
      uniqueOnlyPoints < 0 ||
      !Number.isInteger(uniquePoints) ||
      uniquePoints < 0 ||
      !Number.isInteger(duplicatePoints) ||
      duplicatePoints < 0
    ) {
      throw new InvalidArgumentError('Point values must be non-negative integers.')
    }
    if (
      !Number.isInteger(closingTimeSeconds) ||
      closingTimeSeconds <= 0 ||
      !Number.isInteger(verificationTimeoutSeconds) ||
      verificationTimeoutSeconds <= 0 ||
      !Number.isInteger(waitingForHostTimeoutSeconds) ||
      waitingForHostTimeoutSeconds <= 0
    ) {
      throw new InvalidArgumentError('Timeout values must be positive integers.')
    }
  }
}
