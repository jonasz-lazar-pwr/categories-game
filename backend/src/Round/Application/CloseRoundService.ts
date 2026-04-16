// === src/Round/Application/CloseRoundService.ts ===

import { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import { RoundStatus } from '#/Round/Domain/ValueObjects/RoundStatusVo.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IRoundRepository } from '#/Round/Domain/RoundRepository.js'
import type { CloseRoundCommand } from '#/Round/Application/CommandDto/CloseRoundCommand.js'

export interface IClosedAnswerItem {
  playerId: string
  categoryId: string
  value: string
}

export interface ICloseRoundResult {
  closedAnswers: IClosedAnswerItem[]
  letter: string
}

export interface ICloseRoundService {
  execute(command: CloseRoundCommand): Promise<ICloseRoundResult>
}

export class CloseRoundService implements ICloseRoundService {
  public constructor(private readonly roundRepository: IRoundRepository) {}

  public async execute(command: CloseRoundCommand): Promise<ICloseRoundResult> {
    const round = await this.roundRepository.findById(new RoundIdVo(command.roundId))
    if (round === null) throw new NotFoundError('Round not found.')

    if (round.status !== RoundStatus.finished) {
      round.close()
      await this.roundRepository.save(round)
    }

    const closedAnswers: IClosedAnswerItem[] = []
    for (const pa of round.getSubmittedAnswers()) {
      for (const [categoryId, value] of pa.answers) {
        closedAnswers.push({ playerId: pa.playerId.value, categoryId, value })
      }
    }

    return { closedAnswers, letter: round.letter.value }
  }
}
