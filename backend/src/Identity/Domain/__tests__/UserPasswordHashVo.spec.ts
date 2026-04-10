// === src/Identity/Domain/__tests__/UserPasswordHashVo.spec.ts ===

import { describe, it, expect } from 'vitest'
import { UserPasswordHashVo } from '#/Identity/Domain/ValueObjects/UserPasswordHashVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

describe('UserPasswordHashVo', () => {
  it('throws InvalidArgumentError when value is empty', () => {
    expect(() => new UserPasswordHashVo('')).toThrow(InvalidArgumentError)
  })

  it('accepts a non-empty hash string', () => {
    const hash = new UserPasswordHashVo('$2b$12$somebcrypthashvalue')
    expect(hash.value).toBe('$2b$12$somebcrypthashvalue')
  })
})
