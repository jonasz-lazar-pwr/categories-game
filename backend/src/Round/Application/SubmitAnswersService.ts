// === src/Round/Application/SubmitAnswersService.ts ===

import { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import { RoundStatus } from '#/Round/Domain/ValueObjects/RoundStatusVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IRoundRepository } from '#/Round/Domain/RoundRepository.js'
import type { SubmitAnswersCommand } from '#/Round/Application/CommandDto/SubmitAnswersCommand.js'

export interface ISubmitAnswersResult {
  isFirstSubmit: boolean
  closingDeadline: Date | undefined
  allSubmitted: boolean
}

export interface ISubmitAnswersService {
  execute(command: SubmitAnswersCommand): Promise<ISubmitAnswersResult>
}

export class SubmitAnswersService implements ISubmitAnswersService {
  public constructor(private readonly roundRepository: IRoundRepository) {}

  public async execute(command: SubmitAnswersCommand): Promise<ISubmitAnswersResult> {
    const round = await this.roundRepository.findById(new RoundIdVo(command.roundId))
    if (round === null) throw new NotFoundError('Round not found.')

    const isFirstSubmit = round.status === RoundStatus.answering
    const answersMap = new Map<string, string>(Object.entries(command.answers))

    round.submitAnswers(new PlayerIdVo(command.playerId), answersMap)

    let closingDeadline: Date | undefined
    if (isFirstSubmit) {
      closingDeadline = new Date(Date.now() + command.closingTimeSeconds * 1000)
      round.startClosing(closingDeadline)
    }

    await this.roundRepository.save(round)

    return {
      isFirstSubmit,
      closingDeadline,
      allSubmitted: round.hasAllSubmitted(),
    }
  }
}
