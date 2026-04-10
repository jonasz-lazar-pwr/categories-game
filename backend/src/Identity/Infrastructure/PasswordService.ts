// === src/Identity/Infrastructure/PasswordService.ts ===

import bcrypt from 'bcrypt'
import type { PasswordVerifier } from '#/Identity/Application/LoginUserService.js'

const COST_FACTOR = 12

export class PasswordService implements PasswordVerifier {
  public async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, COST_FACTOR)
  }

  public async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash)
  }
}
