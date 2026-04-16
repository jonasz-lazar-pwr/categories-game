// === src/Round/Application/StartRoundService.ts ===

import crypto from 'node:crypto'
import { RoundAggregate } from '#/Round/Domain/RoundAggregate.js'
import { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import { RoundLetterVo } from '#/Round/Domain/ValueObjects/RoundLetterVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import type { IRoundRepository } from '#/Round/Domain/RoundRepository.js'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'
import type { StartRoundCommand } from '#/Round/Application/CommandDto/StartRoundCommand.js'

export interface IStartRoundResult {
  roundId: string
  roundNumber: number
  letter: string
  categories: { categoryId: string; name: string; description: string }[]
  players: { playerId: string; nick: string }[]
  closingTimeSeconds: number
  verificationTimeoutSeconds: number
}

export interface IStartRoundService {
  execute(command: StartRoundCommand): Promise<IStartRoundResult>
}

export class StartRoundService implements IStartRoundService {
  public constructor(
    private readonly gameFacade: IGameFacade,
    private readonly roundRepository: IRoundRepository,
  ) {}

  public async execute(command: StartRoundCommand): Promise<IStartRoundResult> {
    const gameId = new GameIdVo(command.gameId)
    const config = await this.gameFacade.startRound(gameId)

    const roundId = new RoundIdVo(crypto.randomUUID())
    const letter = new RoundLetterVo(config.letter)
    const playerIds = config.players.map((p) => new PlayerIdVo(p.playerId))

    const round = RoundAggregate.create(roundId, gameId, config.roundNumber, letter, playerIds)
    await this.roundRepository.save(round)

    return {
      roundId: roundId.value,
      roundNumber: config.roundNumber,
      letter: config.letter,
      categories: config.categories.map((c) => ({
        categoryId: c.categoryId,
        name: c.name,
        description: c.description,
      })),
      players: config.players.map((p) => ({
        playerId: p.playerId,
        nick: p.nick,
      })),
      closingTimeSeconds: config.scoringConfig.closingTimeSeconds,
      verificationTimeoutSeconds: config.scoringConfig.verificationTimeoutSeconds,
    }
  }
}
