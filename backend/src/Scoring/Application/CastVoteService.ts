// === src/Scoring/Application/CastVoteService.ts ===

import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { VerificationIdVo } from '#/Scoring/Domain/ValueObjects/VerificationIdVo.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IVerificationRepository } from '#/Scoring/Domain/VerificationRepository.js'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'
import type { CastVoteCommand } from '#/Scoring/Application/CommandDto/CastVoteCommand.js'

export interface ICastVoteResult {
  verificationId: string
  gameId: string
  voterId: string
  allEligibleVotesCast: boolean
}

export interface ICastVoteService {
  execute(command: CastVoteCommand): Promise<ICastVoteResult>
}

export class CastVoteService implements ICastVoteService {
  public constructor(
    private readonly verificationRepository: IVerificationRepository,
    private readonly gameFacade: IGameFacade,
  ) {}

  public async execute(command: CastVoteCommand): Promise<ICastVoteResult> {
    const verification = await this.verificationRepository.findById(
      new VerificationIdVo(command.verificationId),
    )
    if (verification === null) throw new NotFoundError('Verification not found.')

    const gameId = verification.gameId.value
    const cursorPlayerId = verification.cursorPlayerId
    const cursorCategoryId = verification.cursorCategoryId

    if (cursorPlayerId === null || cursorCategoryId === null) {
      throw new NotFoundError('No active cursor position.')
    }

    verification.castVote(
      new PlayerIdVo(command.voterId),
      cursorPlayerId,
      cursorCategoryId,
      command.accepted,
    )
    await this.verificationRepository.save(verification)

    const gameState = await this.gameFacade.getGameState(new GameIdVo(gameId))
    const eligibleVoters = gameState.players.filter(
      (p) => p.isConnected && p.playerId !== cursorPlayerId.value,
    )

    const currentItem = verification.items.find(
      (i) => i.playerId.value === cursorPlayerId.value && i.categoryId === cursorCategoryId,
    )
    const voteCount = currentItem?.votes.length ?? 0
    const allEligibleVotesCast = voteCount >= eligibleVoters.length

    return {
      verificationId: command.verificationId,
      gameId,
      voterId: command.voterId,
      allEligibleVotesCast,
    }
  }
}
