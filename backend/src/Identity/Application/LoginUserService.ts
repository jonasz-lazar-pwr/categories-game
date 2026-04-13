// === src/Identity/Application/LoginUserService.ts ===

import { UserEmailVo } from '#/Identity/Domain/ValueObjects/UserEmailVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import type { IUserRepository } from '#/Identity/Domain/UserRepository.js'
import type { LoginUserCommand } from '#/Identity/Application/CommandDto/LoginUserCommand.js'

export interface IPasswordVerifier {
  verify(plain: string, hash: string): Promise<boolean>
}

export class LoginUserService {
  public constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordVerifier: IPasswordVerifier,
  ) {}

  public async execute(command: LoginUserCommand): Promise<{ userId: string }> {
    const email = new UserEmailVo(command.email)
    const user = await this.userRepository.findByEmail(email)

    if (user === null) throw new InvalidArgumentError('Invalid credentials.')

    const valid = await this.passwordVerifier.verify(
      command.plainPassword,
      user.getPasswordHash().value,
    )
    if (!valid) throw new InvalidArgumentError('Invalid credentials.')

    return { userId: user.id.value }
  }
}
