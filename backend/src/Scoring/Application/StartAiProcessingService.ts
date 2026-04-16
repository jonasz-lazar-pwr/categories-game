// === src/Scoring/Application/StartAiProcessingService.ts ===

import crypto from 'node:crypto'
import { VerificationAggregate } from '#/Scoring/Domain/VerificationAggregate.js'
import { VerificationIdVo } from '#/Scoring/Domain/ValueObjects/VerificationIdVo.js'
import { AiScoreVo } from '#/Scoring/Domain/ValueObjects/AiScoreVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import type { IVerificationRepository } from '#/Scoring/Domain/VerificationRepository.js'
import type { IAiService } from '#/Scoring/Application/IAiService.js'
import type { IGameFacade } from '#/Game/Domain/GameFacade.js'
import type { AnswerVerificationItem } from '#/Scoring/Domain/VerificationAggregate.js'
import type { IScoringEventEmitter } from '#/Scoring/Application/ScoringEventEmitter.js'
import type { StartAiProcessingCommand } from '#/Scoring/Application/CommandDto/StartAiProcessingCommand.js'

const AI_CONCURRENCY_LIMIT = 5

export interface IStartAiProcessingService {
  execute(command: StartAiProcessingCommand): Promise<void>
}

export class StartAiProcessingService implements IStartAiProcessingService {
  public constructor(
    private readonly verificationRepository: IVerificationRepository,
    private readonly aiService: IAiService,
    private readonly gameFacade: IGameFacade,
    private readonly eventEmitter: IScoringEventEmitter,
  ) {}

  public async execute(command: StartAiProcessingCommand): Promise<void> {
    const answers = command.closedAnswers.map((a) => ({
      playerId: new PlayerIdVo(a.playerId),
      categoryId: a.categoryId,
      value: a.value,
    }))

    const verification = VerificationAggregate.create(
      new VerificationIdVo(crypto.randomUUID()),
      new RoundIdVo(command.roundId),
      new GameIdVo(command.gameId),
      answers,
      () => crypto.randomUUID(),
    )

    await this.verificationRepository.save(verification)

    const nonEmptyCount = answers.filter((a) => a.value.trim() !== '').length
    this.eventEmitter.emitAiProcessingStarted(command.gameId, verification.id.value, nonEmptyCount)

    // Fire-and-forget: AI processing runs in background
    void this.runAiProcessing(verification, command.gameId, command.letter)
  }

  // === Private Helpers ===

  private async runAiProcessing(
    verification: VerificationAggregate,
    gameId: string,
    letter: string,
  ): Promise<void> {
    const gameState = await this.gameFacade.getGameState(new GameIdVo(gameId))
    const categoryMap = new Map(gameState.categories.map((c) => [c.categoryId, c]))

    const nonEmptyItems = verification.items.filter((i) => !i.isEmpty)

    await this.runWithConcurrency(nonEmptyItems, async (item: AnswerVerificationItem) => {
      const category = categoryMap.get(item.categoryId)
      const categoryName = category?.name ?? item.categoryId
      const categoryDescription = category?.description ?? ''

      let score = 0
      let reasoning = 'AI evaluation failed'

      try {
        const result = await this.aiService.evaluate(
          item.value,
          categoryName,
          categoryDescription,
          letter,
        )
        score = result.score
        reasoning = result.reasoning
      } catch {
        // Graceful fallback — answer will be treated as 0-score by AI vote
      }

      verification.setAiResult(item.playerId, item.categoryId, new AiScoreVo(score), reasoning)
      await this.verificationRepository.saveAiResult(item.id, score, reasoning)
    })

    await this.verificationRepository.save(verification)

    const firstItem =
      verification.cursorPlayerId !== null && verification.cursorCategoryId !== null
        ? verification.items.find(
            (i) =>
              i.playerId.value === verification.cursorPlayerId?.value &&
              i.categoryId === verification.cursorCategoryId,
          )
        : undefined

    this.eventEmitter.emitAiProcessingDone(
      gameId,
      verification.id.value,
      firstItem !== undefined
        ? {
            playerId: firstItem.playerId.value,
            categoryId: firstItem.categoryId,
            value: firstItem.value,
            aiScore: firstItem.aiScore?.value ?? 0,
            aiReasoning: firstItem.aiReasoning,
          }
        : null,
    )
  }

  private async runWithConcurrency(
    items: AnswerVerificationItem[],
    task: (item: AnswerVerificationItem) => Promise<void>,
  ): Promise<void> {
    const queue = [...items]
    const workers = Array.from(
      { length: Math.min(AI_CONCURRENCY_LIMIT, queue.length) },
      async () => {
        while (queue.length > 0) {
          const item = queue.shift()
          if (item !== undefined) await task(item)
        }
      },
    )
    await Promise.all(workers)
  }
}
