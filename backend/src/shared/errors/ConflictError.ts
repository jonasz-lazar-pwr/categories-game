// === src/shared/errors/ConflictError.ts ===

export class ConflictError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}
