// === src/Identity/Infrastructure/JwtService.ts ===

import jwt from 'jsonwebtoken'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

function isTokenPayload(value: unknown): value is { sub: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sub' in value &&
    typeof (value as Record<string, unknown>)['sub'] === 'string'
  )
}

export class JwtService {
  private readonly accessSecret: string
  private readonly refreshSecret: string

  public constructor() {
    const accessSecret = process.env['JWT_ACCESS_SECRET']
    const refreshSecret = process.env['JWT_REFRESH_SECRET']
    if (!accessSecret) throw new Error('JWT_ACCESS_SECRET is not set.')
    if (!refreshSecret) throw new Error('JWT_REFRESH_SECRET is not set.')
    this.accessSecret = accessSecret
    this.refreshSecret = refreshSecret
  }

  public signAccess(userId: string): string {
    return jwt.sign({ sub: userId }, this.accessSecret, { expiresIn: '15m' })
  }

  public signRefresh(userId: string): string {
    return jwt.sign({ sub: userId }, this.refreshSecret, { expiresIn: '7d' })
  }

  public verifyAccess(token: string): string {
    try {
      const payload = jwt.verify(token, this.accessSecret)
      if (!isTokenPayload(payload))
        throw new InvalidArgumentError('Access token is invalid or expired.')
      return payload.sub
    } catch (error) {
      if (error instanceof InvalidArgumentError) throw error
      throw new InvalidArgumentError('Access token is invalid or expired.')
    }
  }

  public verifyRefresh(token: string): string {
    try {
      const payload = jwt.verify(token, this.refreshSecret)
      if (!isTokenPayload(payload))
        throw new InvalidArgumentError('Refresh token is invalid or expired.')
      return payload.sub
    } catch (error) {
      if (error instanceof InvalidArgumentError) throw error
      throw new InvalidArgumentError('Refresh token is invalid or expired.')
    }
  }
}
