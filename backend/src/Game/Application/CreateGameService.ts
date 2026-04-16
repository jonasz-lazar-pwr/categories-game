// === src/Game/Application/CreateGameService.ts ===

import { GameAggregate } from '#/Game/Domain/GameAggregate.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { GameCodeVo } from '#/Game/Domain/ValueObjects/GameCodeVo.js'
import { RoundCountVo } from '#/Game/Domain/ValueObjects/RoundCountVo.js'
import { CategoryIdVo } from '#/Game/Domain/ValueObjects/CategoryIdVo.js'
import { CategoryConfig } from '#/Game/Domain/Entities/CategoryConfig.js'
import { ScoringConfig } from '#/Game/Domain/Entities/ScoringConfig.js'
import { AlphabetPreset } from '#/Game/Domain/ValueObjects/AlphabetPresetVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { ICategoryRepository } from '#/Game/Domain/CategoryRepository.js'
import type { CreateGameCommand } from '#/Game/Application/CommandDto/CreateGameCommand.js'

export interface ICreateGameResult {
  gameId: string
  gameCode: string
  playerId: string
}

export class CreateGameService {
  public constructor(
    private readonly gameRepository: IGameRepository,
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  public async execute(command: CreateGameCommand): Promise<ICreateGameResult> {
    const alphabetPreset = this.resolveAlphabetPreset(command.alphabetPreset)

    const categoryConfigs = await this.resolveCategoryConfigs(command.categoryIds)

    const scoringConfig = new ScoringConfig(
      command.uniqueOnlyPoints,
      command.uniquePoints,
      command.duplicatePoints,
      command.closingTimeSeconds,
      command.verificationTimeoutSeconds,
      command.waitingForHostTimeoutSeconds,
    )

    const game = GameAggregate.create(
      new GameIdVo(command.gameId),
      new GameCodeVo(command.code),
      new PlayerIdVo(command.newPlayerId),
      new UserIdVo(command.hostUserId),
      command.hostNick,
      {
        alphabetPreset,
        roundCount: new RoundCountVo(command.roundCount),
        categories: categoryConfigs,
        scoringConfig,
      },
    )

    await this.gameRepository.save(game)

    return { gameId: command.gameId, gameCode: command.code, playerId: command.newPlayerId }
  }

  // === Private Helpers ===

  private resolveAlphabetPreset(value: string): AlphabetPreset {
    const preset = Object.values(AlphabetPreset).find((p) => p === value)
    if (preset === undefined) {
      throw new InvalidArgumentError(`Unknown alphabet preset: ${value}.`)
    }
    return preset
  }

  private async resolveCategoryConfigs(categoryIds: string[]): Promise<CategoryConfig[]> {
    const configs: CategoryConfig[] = []
    for (const id of categoryIds) {
      const categoryIdVo = new CategoryIdVo(id)
      const category = await this.categoryRepository.findById(categoryIdVo)
      if (category === null) {
        throw new NotFoundError(`Category ${id} not found.`)
      }
      configs.push(new CategoryConfig(category.id, category.name, category.description))
    }
    return configs
  }
}
