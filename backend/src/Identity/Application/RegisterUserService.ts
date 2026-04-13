// === src/Identity/Application/RegisterUserService.ts ===

import { UserAggregate } from '#/Identity/Domain/UserAggregate.js'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { UserEmailVo } from '#/Identity/Domain/ValueObjects/UserEmailVo.js'
import { UserNickVo } from '#/Identity/Domain/ValueObjects/UserNickVo.js'
import { UserPasswordHashVo } from '#/Identity/Domain/ValueObjects/UserPasswordHashVo.js'
import { ConflictError } from '#/shared/errors/ConflictError.js'
import type { IUserRepository } from '#/Identity/Domain/UserRepository.js'
import type { RegisterUserCommand } from '#/Identity/Application/CommandDto/RegisterUserCommand.js'

export class RegisterUserService {
  public constructor(private readonly userRepository: IUserRepository) {}

  public async execute(command: RegisterUserCommand): Promise<void> {
    const email = new UserEmailVo(command.email)
    const existing = await this.userRepository.findByEmail(email)
    if (existing !== null) throw new ConflictError('Email is already taken.')

    const user = UserAggregate.create(
      new UserIdVo(command.id),
      email,
      new UserNickVo(command.nick),
      new UserPasswordHashVo(command.passwordHash),
    )

    await this.userRepository.save(user)
  }
}
