// === src/Game/Application/JoinGameService.ts ===

import { GameCodeVo } from '#/Game/Domain/ValueObjects/GameCodeVo.js'
import { GameStatus } from '#/Game/Domain/ValueObjects/GameStatusVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IGameRepository } from '#/Game/Domain/GameRepository.js'
import type { JoinGameCommand } from '#/Game/Application/CommandDto/JoinGameCommand.js'
import type { GameAggregate } from '#/Game/Domain/GameAggregate.js'

export interface JoinGameResult {
  gameId: string
  playerId: string
}

export class JoinGameService {
  public constructor(private readonly gameRepository: IGameRepository) {}

  public async execute(command: JoinGameCommand): Promise<JoinGameResult> {
    const code = new GameCodeVo(command.gameCode)
    const game = await this.gameRepository.findByCode(code)
    if (game === null) throw new NotFoundError('Game not found.')

    if (game.status === GameStatus.lobby) {
      return this.handleLobbyJoin(game, command)
    }

    return this.handleReconnect(game, command)
  }

  // === Private Helpers ===

  private async handleLobbyJoin(
    game: GameAggregate,
    command: JoinGameCommand,
  ): Promise<JoinGameResult> {
    const userId = command.userId !== null ? new UserIdVo(command.userId) : null
    game.addPlayer(new PlayerIdVo(command.newPlayerId), userId, command.nick)
    await this.gameRepository.save(game)
    return { gameId: game.id.value, playerId: command.newPlayerId }
  }

  private async handleReconnect(
    game: GameAggregate,
    command: JoinGameCommand,
  ): Promise<JoinGameResult> {
    const existingPlayer = this.findReconnectingPlayer(game, command)
    if (existingPlayer === null) throw new NotFoundError('Player not found in this game.')

    return { gameId: game.id.value, playerId: existingPlayer.playerId.value }
  }

  private findReconnectingPlayer(
    game: GameAggregate,
    command: JoinGameCommand,
  ): { playerId: PlayerIdVo } | null {
    if (command.userId !== null) {
      const player = game.players.find(
        (p) => p.userId !== null && p.userId.value === command.userId,
      )
      return player !== undefined ? { playerId: player.playerId } : null
    }

    const player = game.players.find((p) => p.nick.toLowerCase() === command.nick.toLowerCase())
    return player !== undefined ? { playerId: player.playerId } : null
  }
}
