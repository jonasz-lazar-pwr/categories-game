// === src/Identity/Domain/__tests__/UserAggregate.spec.ts ===

import { describe, it, expect, beforeEach } from 'vitest'
import { UserAggregate } from '#/Identity/Domain/UserAggregate.js'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { UserEmailVo } from '#/Identity/Domain/ValueObjects/UserEmailVo.js'
import { UserNickVo } from '#/Identity/Domain/ValueObjects/UserNickVo.js'
import { UserPasswordHashVo } from '#/Identity/Domain/ValueObjects/UserPasswordHashVo.js'

const makeId = (): UserIdVo => new UserIdVo('550e8400-e29b-41d4-a716-446655440000')
const makeEmail = (): UserEmailVo => new UserEmailVo('user@example.com')
const makeNick = (value = 'testuser'): UserNickVo => new UserNickVo(value)
const makeHash = (): UserPasswordHashVo => new UserPasswordHashVo('$2b$12$hashvalue')

describe('UserAggregate', () => {
  describe('create()', () => {
    it('returns an aggregate with the correct id', () => {
      const id = makeId()
      const agg = UserAggregate.create(id, makeEmail(), makeNick(), makeHash())
      expect(agg.id).toBe(id)
    })

    it('returns an aggregate with the correct email', () => {
      const email = makeEmail()
      const agg = UserAggregate.create(makeId(), email, makeNick(), makeHash())
      expect(agg.email).toBe(email)
    })

    it('returns an aggregate with the correct nick', () => {
      const nick = makeNick('mynick')
      const agg = UserAggregate.create(makeId(), makeEmail(), nick, makeHash())
      expect(agg.getNick()).toBe(nick)
    })

    it('sets createdAt to approximately now', () => {
      const before = new Date()
      const agg = UserAggregate.create(makeId(), makeEmail(), makeNick(), makeHash())
      const after = new Date()
      expect(agg.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(agg.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('restore()', () => {
    it('preserves all fields including the original createdAt', () => {
      const id = makeId()
      const email = makeEmail()
      const nick = makeNick()
      const hash = makeHash()
      const createdAt = new Date('2024-01-01T00:00:00Z')

      const agg = UserAggregate.restore(id, email, nick, hash, createdAt)

      expect(agg.id).toBe(id)
      expect(agg.email).toBe(email)
      expect(agg.getNick()).toBe(nick)
      expect(agg.getPasswordHash()).toBe(hash)
      expect(agg.createdAt).toBe(createdAt)
    })
  })

  describe('changeNick()', () => {
    let agg: UserAggregate

    beforeEach(() => {
      agg = UserAggregate.create(makeId(), makeEmail(), makeNick('original'), makeHash())
    })

    it('updates the nick returned by getNick()', () => {
      const newNick = makeNick('updated')
      agg.changeNick(newNick)
      expect(agg.getNick()).toBe(newNick)
    })
  })

  describe('getPasswordHash()', () => {
    it('returns the hash passed to create()', () => {
      const hash = makeHash()
      const agg = UserAggregate.create(makeId(), makeEmail(), makeNick(), hash)
      expect(agg.getPasswordHash()).toBe(hash)
    })
  })
})
