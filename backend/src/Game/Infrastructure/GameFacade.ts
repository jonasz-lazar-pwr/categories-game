// === src/Game/Infrastructure/GameFacade.ts ===

import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IGameFacade, IGameConfigurationDto, IGameStateDto } from '#/Game/Domain/GameFacade.js'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import type { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'

export class GameFacade implements IGameFacade {
  public constructor(private readonly gameRepository: IGameRepository) {}

  public async startRound(gameId: GameIdVo): Promise<IGameConfigurationDto> {
    const game = await this.gameRepository.findById(gameId)
    if (game === null) throw new NotFoundError('Game not found.')

    const letter = game.drawLetter()
    game.advanceRound()
    await this.gameRepository.save(game)

    return {
      roundNumber: game.currentRoundNumber,
      letter,
      categories: game.categories.map((c) => ({
        categoryId: c.categoryId.value,
        name: c.name,
        description: c.description,
      })),
      players: game.players.map((p) => ({
        playerId: p.playerId.value,
        nick: p.nick,
        score: p.score,
        isConnected: p.isConnected,
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

  public async updatePlayerScore(
    gameId: GameIdVo,
    playerId: PlayerIdVo,
    points: number,
  ): Promise<void> {
    const game = await this.gameRepository.findById(gameId)
    if (game === null) throw new NotFoundError('Game not found.')
    game.updatePlayerScore(playerId, points)
    await this.gameRepository.save(game)
  }

  public async updatePlayerScores(
    gameId: GameIdVo,
    scores: Map<PlayerIdVo, number>,
  ): Promise<void> {
    const game = await this.gameRepository.findById(gameId)
    if (game === null) throw new NotFoundError('Game not found.')
    for (const [playerId, points] of scores) {
      game.updatePlayerScore(playerId, points)
    }
    await this.gameRepository.save(game)
  }

  public async finishGame(gameId: GameIdVo): Promise<void> {
    const game = await this.gameRepository.findById(gameId)
    if (game === null) throw new NotFoundError('Game not found.')
    game.finish()
    await this.gameRepository.save(game)
  }

  public async getGameState(gameId: GameIdVo): Promise<IGameStateDto> {
    const game = await this.gameRepository.findById(gameId)
    if (game === null) throw new NotFoundError('Game not found.')
    return {
      currentRoundNumber: game.currentRoundNumber,
      roundCount: game.roundCount.value,
      scoringConfig: {
        uniqueOnlyPoints: game.scoringConfig.uniqueOnlyPoints,
        uniquePoints: game.scoringConfig.uniquePoints,
        duplicatePoints: game.scoringConfig.duplicatePoints,
        closingTimeSeconds: game.scoringConfig.closingTimeSeconds,
        verificationTimeoutSeconds: game.scoringConfig.verificationTimeoutSeconds,
      },
      categories: game.categories.map((c) => ({
        categoryId: c.categoryId.value,
        name: c.name,
        description: c.description,
      })),
      players: game.players.map((p) => ({
        playerId: p.playerId.value,
        nick: p.nick,
        score: p.score,
        isConnected: p.isConnected,
      })),
    }
  }
}
