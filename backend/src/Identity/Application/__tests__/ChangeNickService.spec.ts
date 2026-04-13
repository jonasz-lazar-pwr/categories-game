// === src/Identity/Application/__tests__/ChangeNickService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChangeNickService } from '#/Identity/Application/ChangeNickService.js'
import { ChangeNickCommand } from '#/Identity/Application/CommandDto/ChangeNickCommand.js'
import { UserAggregate } from '#/Identity/Domain/UserAggregate.js'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { UserEmailVo } from '#/Identity/Domain/ValueObjects/UserEmailVo.js'
import { UserNickVo } from '#/Identity/Domain/ValueObjects/UserNickVo.js'
import { UserPasswordHashVo } from '#/Identity/Domain/ValueObjects/UserPasswordHashVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IUserRepository } from '#/Identity/Domain/UserRepository.js'

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'

const makeUser = (): UserAggregate =>
  UserAggregate.restore(
    new UserIdVo(USER_ID),
    new UserEmailVo('user@example.com'),
    new UserNickVo('original'),
    new UserPasswordHashVo('$2b$12$hash'),
    new Date(),
  )

describe('ChangeNickService', () => {
  let repository: IUserRepository
  let service: ChangeNickService

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
    }
    service = new ChangeNickService(repository)
  })

  it('throws NotFoundError when user does not exist', async () => {
    vi.mocked(repository.findById).mockResolvedValue(null)

    await expect(service.execute(new ChangeNickCommand(USER_ID, 'newnick'))).rejects.toThrow(
      NotFoundError,
    )
  })

  it('calls save with the aggregate after changeNick', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser())
    vi.mocked(repository.save).mockResolvedValue(undefined)

    await service.execute(new ChangeNickCommand(USER_ID, 'newnick'))

    expect(repository.save).toHaveBeenCalledOnce()
  })

  it('saved aggregate has the new nick', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser())
    vi.mocked(repository.save).mockResolvedValue(undefined)

    await service.execute(new ChangeNickCommand(USER_ID, 'newnick'))

    const saved = vi.mocked(repository.save).mock.calls[0]?.[0]
    expect(saved?.getNick().value).toBe('newnick')
  })

  it('throws InvalidArgumentError when new nick is invalid', async () => {
    vi.mocked(repository.findById).mockResolvedValue(makeUser())

    await expect(service.execute(new ChangeNickCommand(USER_ID, 'ab'))).rejects.toThrow(
      InvalidArgumentError,
    )
  })
})
