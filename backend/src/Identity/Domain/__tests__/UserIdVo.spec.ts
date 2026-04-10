// === src/Identity/Domain/__tests__/UserIdVo.spec.ts ===

import { describe, it, expect } from 'vitest'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

describe('UserIdVo', () => {
  it('throws InvalidArgumentError when value is empty string', () => {
    expect(() => new UserIdVo('')).toThrow(InvalidArgumentError)
  })

  it('accepts a valid UUID string', () => {
    const id = new UserIdVo('550e8400-e29b-41d4-a716-446655440000')
    expect(id.value).toBe('550e8400-e29b-41d4-a716-446655440000')
  })
})
