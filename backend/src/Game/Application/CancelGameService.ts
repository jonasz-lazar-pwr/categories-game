// === src/Game/Application/CancelGameService.ts ===

import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { CancelGameCommand } from '#/Game/Application/CommandDto/CancelGameCommand.js'

export interface ICancelGameService {
  execute(command: CancelGameCommand): Promise<void>
}

export class CancelGameService implements ICancelGameService {
  public constructor(private readonly gameRepository: IGameRepository) {}

  public async execute(command: CancelGameCommand): Promise<void> {
    const game = await this.gameRepository.findById(new GameIdVo(command.gameId))
    if (game === null) throw new NotFoundError('Game not found.')

    if (game.hostId.value !== command.requesterId) {
      throw new InvalidArgumentError('Only the host can cancel the game.')
    }

    game.cancel()
    await this.gameRepository.save(game)
  }
}
