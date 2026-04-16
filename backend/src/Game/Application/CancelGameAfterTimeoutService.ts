// === src/Game/Application/CancelGameAfterTimeoutService.ts ===

import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { CancelGameAfterTimeoutCommand } from '#/Game/Application/CommandDto/CancelGameAfterTimeoutCommand.js'

export interface ICancelGameAfterTimeoutService {
  execute(command: CancelGameAfterTimeoutCommand): Promise<void>
}

export class CancelGameAfterTimeoutService implements ICancelGameAfterTimeoutService {
  public constructor(private readonly gameRepository: IGameRepository) {}

  public async execute(command: CancelGameAfterTimeoutCommand): Promise<void> {
    const game = await this.gameRepository.findById(new GameIdVo(command.gameId))
    if (game === null) throw new NotFoundError('Game not found.')

    const host = game.players.find((p) => p.isHost)
    if (host === undefined) throw new NotFoundError('Host not found in game.')

    if (host.isConnected) {
      throw new InvalidArgumentError('Cannot cancel after timeout: host is still connected.')
    }

    game.cancel()
    await this.gameRepository.save(game)
  }
}
