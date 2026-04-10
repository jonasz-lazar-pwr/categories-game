// === src/Identity/Application/__tests__/RegisterUserService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RegisterUserService } from '#/Identity/Application/RegisterUserService.js'
import { RegisterUserCommand } from '#/Identity/Application/CommandDto/RegisterUserCommand.js'
import { UserAggregate } from '#/Identity/Domain/UserAggregate.js'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { UserEmailVo } from '#/Identity/Domain/ValueObjects/UserEmailVo.js'
import { UserNickVo } from '#/Identity/Domain/ValueObjects/UserNickVo.js'
import { UserPasswordHashVo } from '#/Identity/Domain/ValueObjects/UserPasswordHashVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { ConflictError } from '#/shared/errors/ConflictError.js'
import type { UserRepository } from '#/Identity/Domain/UserRepository.js'

const makeExistingUser = (): UserAggregate =>
  UserAggregate.restore(
    new UserIdVo('550e8400-e29b-41d4-a716-446655440000'),
    new UserEmailVo('taken@example.com'),
    new UserNickVo('takenuser'),
    new UserPasswordHashVo('$2b$12$hash'),
    new Date(),
  )

describe('RegisterUserService', () => {
  let repository: UserRepository
  let service: RegisterUserService

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
    }
    service = new RegisterUserService(repository)
  })

  it('calls findByEmail with the correct email', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null)
    vi.mocked(repository.save).mockResolvedValue(undefined)

    await service.execute(
      new RegisterUserCommand('some-id', 'user@example.com', 'validnick', '$2b$12$hash'),
    )

    expect(repository.findByEmail).toHaveBeenCalledOnce()
    expect(vi.mocked(repository.findByEmail).mock.calls[0]?.[0]?.value).toBe('user@example.com')
  })

  it('calls save with a UserAggregate when email is not taken', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null)
    vi.mocked(repository.save).mockResolvedValue(undefined)

    await service.execute(
      new RegisterUserCommand('some-id', 'user@example.com', 'validnick', '$2b$12$hash'),
    )

    expect(repository.save).toHaveBeenCalledOnce()
    expect(vi.mocked(repository.save).mock.calls[0]?.[0]).toBeInstanceOf(UserAggregate)
  })

  it('throws ConflictError when email is already taken', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeExistingUser())

    await expect(
      service.execute(
        new RegisterUserCommand('some-id', 'taken@example.com', 'validnick', '$2b$12$hash'),
      ),
    ).rejects.toThrow(new ConflictError('Email is already taken.'))
  })

  it('does not call save when email is taken', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeExistingUser())

    await expect(
      service.execute(
        new RegisterUserCommand('some-id', 'taken@example.com', 'validnick', '$2b$12$hash'),
      ),
    ).rejects.toThrow(ConflictError)

    expect(repository.save).not.toHaveBeenCalled()
  })

  it('throws InvalidArgumentError when email format is invalid', async () => {
    await expect(
      service.execute(new RegisterUserCommand('some-id', 'bademail', 'validnick', '$2b$12$hash')),
    ).rejects.toThrow(InvalidArgumentError)
  })

  it('throws InvalidArgumentError when nick is invalid', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null)

    await expect(
      service.execute(new RegisterUserCommand('some-id', 'user@example.com', 'ab', '$2b$12$hash')),
    ).rejects.toThrow(InvalidArgumentError)
  })
})
