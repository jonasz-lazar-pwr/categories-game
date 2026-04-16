// === src/Scoring/Infrastructure/ScoringFacade.ts ===

import { StartAiProcessingCommand } from '#/Scoring/Application/CommandDto/StartAiProcessingCommand.js'
import type { IScoringFacade, IClosedAnswerForScoringDto } from '#/Round/Domain/ScoringFacade.js'
import type { IStartAiProcessingService } from '#/Scoring/Application/StartAiProcessingService.js'

export class ScoringFacade implements IScoringFacade {
  public constructor(private readonly startAiProcessingService: IStartAiProcessingService) {}

  public async startAiProcessing(
    roundId: string,
    gameId: string,
    letter: string,
    closedAnswers: IClosedAnswerForScoringDto[],
  ): Promise<void> {
    await this.startAiProcessingService.execute(
      new StartAiProcessingCommand(roundId, gameId, letter, closedAnswers),
    )
  }
}
