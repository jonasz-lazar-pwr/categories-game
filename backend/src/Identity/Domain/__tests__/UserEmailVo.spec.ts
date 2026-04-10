// === src/Identity/Domain/__tests__/UserEmailVo.spec.ts ===

import { describe, it, expect } from 'vitest'
import { UserEmailVo } from '#/Identity/Domain/ValueObjects/UserEmailVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

describe('UserEmailVo', () => {
  it('throws InvalidArgumentError when value is empty', () => {
    expect(() => new UserEmailVo('')).toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError when value has no @ symbol', () => {
    expect(() => new UserEmailVo('notanemail')).toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError when value has no domain after @', () => {
    expect(() => new UserEmailVo('user@')).toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError when value has no local part before @', () => {
    expect(() => new UserEmailVo('@domain.com')).toThrow(InvalidArgumentError)
  })

  it('accepts a valid email address', () => {
    const email = new UserEmailVo('user@example.com')
    expect(email.value).toBe('user@example.com')
  })
})
