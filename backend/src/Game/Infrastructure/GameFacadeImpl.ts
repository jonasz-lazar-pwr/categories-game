// === src/Game/Infrastructure/GameFacadeImpl.ts ===

import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IGameFacade, GameConfigurationDto } from '#/Game/Domain/GameFacade.js'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'

export class GameFacadeImpl implements IGameFacade {
  public constructor(private readonly gameRepository: IGameRepository) {}

  public async startRound(gameId: GameIdVo): Promise<GameConfigurationDto> {
    const game = await this.gameRepository.findById(gameId)
    if (game === null) throw new NotFoundError('Game not found.')

    const letter = game.drawLetter()
    game.advanceRound()
    await this.gameRepository.save(game)

    return {
      letter,
      categories: game.categories.map((c) => ({
        categoryId: c.categoryId.value,
        name: c.name,
        description: c.description,
      })),
      players: game.players.map((p) => ({
        playerId: p.playerId.value,
        nick: p.nick,
      })),
      scoringConfig: {
        uniqueOnlyPoints: game.scoringConfig.uniqueOnlyPoints,
        uniquePoints: game.scoringConfig.uniquePoints,
        duplicatePoints: game.scoringConfig.duplicatePoints,
        closingTimeSeconds: game.scoringConfig.closingTimeSeconds,
        verificationTimeoutSeconds: game.scoringConfig.verificationTimeoutSeconds,
      },
    }
  }
}
