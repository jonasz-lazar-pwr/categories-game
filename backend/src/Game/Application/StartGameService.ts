// === src/Game/Application/StartGameService.ts ===

import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { StartGameCommand } from '#/Game/Application/CommandDto/StartGameCommand.js'

export interface IStartGameService {
  execute(command: StartGameCommand): Promise<void>
}

export class StartGameService implements IStartGameService {
  public constructor(private readonly gameRepository: IGameRepository) {}

  public async execute(command: StartGameCommand): Promise<void> {
    const game = await this.gameRepository.findById(new GameIdVo(command.gameId))
    if (game === null) throw new NotFoundError('Game not found.')

    if (game.hostId.value !== command.requesterId) {
      throw new InvalidArgumentError('Only the host can start the game.')
    }

    game.start()
    await this.gameRepository.save(game)
  }
}
