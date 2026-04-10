// === src/Identity/Domain/__tests__/UserNickVo.spec.ts ===

import { describe, it, expect } from 'vitest'
import { UserNickVo } from '#/Identity/Domain/ValueObjects/UserNickVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'

describe('UserNickVo', () => {
  it('throws InvalidArgumentError when value is empty', () => {
    expect(() => new UserNickVo('')).toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError when shorter than 3 characters', () => {
    expect(() => new UserNickVo('ab')).toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError when longer than 20 characters', () => {
    expect(() => new UserNickVo('a'.repeat(21))).toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError when contains spaces', () => {
    expect(() => new UserNickVo('invalid nick')).toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError when contains @ symbol', () => {
    expect(() => new UserNickVo('invalid@nick')).toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError when contains hyphen', () => {
    expect(() => new UserNickVo('invalid-nick')).toThrow(InvalidArgumentError)
  })

  it('accepts a nick with letters only', () => {
    const nick = new UserNickVo('validnick')
    expect(nick.value).toBe('validnick')
  })

  it('accepts a nick with digits and underscores', () => {
    const nick = new UserNickVo('user_123')
    expect(nick.value).toBe('user_123')
  })

  it('accepts a nick at exactly 3 characters', () => {
    const nick = new UserNickVo('abc')
    expect(nick.value).toBe('abc')
  })

  it('accepts a nick at exactly 20 characters', () => {
    const nick = new UserNickVo('a'.repeat(20))
    expect(nick.value).toBe('a'.repeat(20))
  })
})
