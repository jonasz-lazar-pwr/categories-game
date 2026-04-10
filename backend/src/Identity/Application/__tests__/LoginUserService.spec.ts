// === src/Identity/Application/__tests__/LoginUserService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginUserService } from '#/Identity/Application/LoginUserService.js'
import { LoginUserCommand } from '#/Identity/Application/CommandDto/LoginUserCommand.js'
import { UserAggregate } from '#/Identity/Domain/UserAggregate.js'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { UserEmailVo } from '#/Identity/Domain/ValueObjects/UserEmailVo.js'
import { UserNickVo } from '#/Identity/Domain/ValueObjects/UserNickVo.js'
import { UserPasswordHashVo } from '#/Identity/Domain/ValueObjects/UserPasswordHashVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import type { UserRepository } from '#/Identity/Domain/UserRepository.js'
import type { PasswordVerifier } from '#/Identity/Application/LoginUserService.js'

const USER_ID = '550e8400-e29b-41d4-a716-446655440000'

const makeUser = (): UserAggregate =>
  UserAggregate.restore(
    new UserIdVo(USER_ID),
    new UserEmailVo('user@example.com'),
    new UserNickVo('testuser'),
    new UserPasswordHashVo('$2b$12$hash'),
    new Date(),
  )

describe('LoginUserService', () => {
  let repository: UserRepository
  let passwordVerifier: PasswordVerifier
  let service: LoginUserService

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      save: vi.fn(),
    }
    passwordVerifier = {
      verify: vi.fn(),
    }
    service = new LoginUserService(repository, passwordVerifier)
  })

  it('throws InvalidArgumentError when user is not found', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null)

    await expect(
      service.execute(new LoginUserCommand('user@example.com', 'password')),
    ).rejects.toThrow(new InvalidArgumentError('Invalid credentials.'))
  })

  it('throws InvalidArgumentError when password is incorrect', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser())
    vi.mocked(passwordVerifier.verify).mockResolvedValue(false)

    await expect(
      service.execute(new LoginUserCommand('user@example.com', 'wrongpassword')),
    ).rejects.toThrow(new InvalidArgumentError('Invalid credentials.'))
  })

  it('returns userId when credentials are valid', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(makeUser())
    vi.mocked(passwordVerifier.verify).mockResolvedValue(true)

    const result = await service.execute(new LoginUserCommand('user@example.com', 'correctpass'))

    expect(result).toEqual({ userId: USER_ID })
  })

  it('does not call verify when user is not found', async () => {
    vi.mocked(repository.findByEmail).mockResolvedValue(null)

    await expect(
      service.execute(new LoginUserCommand('user@example.com', 'password')),
    ).rejects.toThrow(InvalidArgumentError)

    expect(passwordVerifier.verify).not.toHaveBeenCalled()
  })
})
