// === src/shared/errors/NotFoundError.ts ===

export class NotFoundError extends Error {
  public constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}
