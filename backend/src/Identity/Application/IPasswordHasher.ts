// === src/Identity/Application/IPasswordHasher.ts ===

export interface IPasswordHasher {
  hash(plain: string): Promise<string>
}
