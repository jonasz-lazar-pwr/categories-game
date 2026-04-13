// === src/Identity/Application/ChangeNickService.ts ===

import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { UserNickVo } from '#/Identity/Domain/ValueObjects/UserNickVo.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IUserRepository } from '#/Identity/Domain/UserRepository.js'
import type { ChangeNickCommand } from '#/Identity/Application/CommandDto/ChangeNickCommand.js'

export class ChangeNickService {
  public constructor(private readonly userRepository: IUserRepository) {}

  public async execute(command: ChangeNickCommand): Promise<void> {
    const user = await this.userRepository.findById(new UserIdVo(command.userId))
    if (user === null) throw new NotFoundError('User not found.')

    user.changeNick(new UserNickVo(command.newNick))
    await this.userRepository.save(user)
  }
}
