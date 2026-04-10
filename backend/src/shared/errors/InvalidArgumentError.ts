// === src/shared/errors/InvalidArgumentError.ts ===

export class InvalidArgumentError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'InvalidArgumentError'
  }
}
