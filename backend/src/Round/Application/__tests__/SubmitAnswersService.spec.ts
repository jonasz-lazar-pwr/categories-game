// === src/Round/Application/__tests__/SubmitAnswersService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SubmitAnswersService } from '#/Round/Application/SubmitAnswersService.js'
import { SubmitAnswersCommand } from '#/Round/Application/CommandDto/SubmitAnswersCommand.js'
import { RoundAggregate } from '#/Round/Domain/RoundAggregate.js'
import { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import { RoundLetterVo } from '#/Round/Domain/ValueObjects/RoundLetterVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import type { IRoundRepository } from '#/Round/Domain/RoundRepository.js'

const makeRoundRepo = (): IRoundRepository => ({
  findById: vi.fn(),
  findByGameId: vi.fn(),
  findClosingWithDeadlineAfter: vi.fn(),
  save: vi.fn(),
})

const makeRound = (playerIds: string[] = ['player-1', 'player-2']): RoundAggregate =>
  RoundAggregate.create(
    new RoundIdVo('round-id-1'),
    new GameIdVo('game-id-1'),
    1,
    new RoundLetterVo('A'),
    playerIds.map((id) => new PlayerIdVo(id)),
  )

describe('SubmitAnswersService', () => {
  let roundRepo: IRoundRepository
  let service: SubmitAnswersService

  beforeEach(() => {
    roundRepo = makeRoundRepo()
    service = new SubmitAnswersService(roundRepo)
    vi.mocked(roundRepo.save).mockResolvedValue()
  })

  it('returns isFirstSubmit=true and a closingDeadline for the first submission', async () => {
    vi.mocked(roundRepo.findById).mockResolvedValue(makeRound())

    const result = await service.execute(
      new SubmitAnswersCommand('round-id-1', 'player-1', { 'cat-1': 'Poland' }, 15),
    )

    expect(result.isFirstSubmit).toBe(true)
    expect(result.closingDeadline).toBeInstanceOf(Date)
  })

  it('returns isFirstSubmit=false for a subsequent submission', async () => {
    const round = makeRound()
    round.submitAnswers(new PlayerIdVo('player-1'), new Map())
    round.startClosing(new Date(Date.now() + 15000))
    vi.mocked(roundRepo.findById).mockResolvedValue(round)

    const result = await service.execute(
      new SubmitAnswersCommand('round-id-1', 'player-2', { 'cat-1': 'France' }, 15),
    )

    expect(result.isFirstSubmit).toBe(false)
    expect(result.closingDeadline).toBeUndefined()
  })

  it('returns allSubmitted=true when all players have submitted', async () => {
    const round = makeRound(['player-1'])
    vi.mocked(roundRepo.findById).mockResolvedValue(round)

    const result = await service.execute(new SubmitAnswersCommand('round-id-1', 'player-1', {}, 15))

    expect(result.allSubmitted).toBe(true)
  })

  it('returns allSubmitted=false when not all players have submitted', async () => {
    vi.mocked(roundRepo.findById).mockResolvedValue(makeRound(['player-1', 'player-2']))

    const result = await service.execute(new SubmitAnswersCommand('round-id-1', 'player-1', {}, 15))

    expect(result.allSubmitted).toBe(false)
  })

  it('saves the round after submission', async () => {
    vi.mocked(roundRepo.findById).mockResolvedValue(makeRound())

    await service.execute(new SubmitAnswersCommand('round-id-1', 'player-1', {}, 15))

    expect(roundRepo.save).toHaveBeenCalledOnce()
  })

  it('throws NotFoundError when round does not exist', async () => {
    vi.mocked(roundRepo.findById).mockResolvedValue(null)

    await expect(
      service.execute(new SubmitAnswersCommand('round-id-1', 'player-1', {}, 15)),
    ).rejects.toThrow(NotFoundError)
  })

  it('throws InvalidArgumentError when player already submitted', async () => {
    const round = makeRound()
    round.submitAnswers(new PlayerIdVo('player-1'), new Map())
    round.startClosing(new Date(Date.now() + 15000))
    vi.mocked(roundRepo.findById).mockResolvedValue(round)

    await expect(
      service.execute(new SubmitAnswersCommand('round-id-1', 'player-1', {}, 15)),
    ).rejects.toThrow(InvalidArgumentError)
  })
})
