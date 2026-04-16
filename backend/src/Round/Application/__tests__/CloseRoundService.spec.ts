// === src/Round/Application/__tests__/CloseRoundService.spec.ts ===

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CloseRoundService } from '#/Round/Application/CloseRoundService.js'
import { CloseRoundCommand } from '#/Round/Application/CommandDto/CloseRoundCommand.js'
import { RoundAggregate } from '#/Round/Domain/RoundAggregate.js'
import { RoundIdVo } from '#/Round/Domain/ValueObjects/RoundIdVo.js'
import { RoundLetterVo } from '#/Round/Domain/ValueObjects/RoundLetterVo.js'
import { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import { GameIdVo } from '#/Game/Domain/ValueObjects/GameIdVo.js'
import { RoundStatus } from '#/Round/Domain/ValueObjects/RoundStatusVo.js'
import { NotFoundError } from '#/shared/errors/NotFoundError.js'
import type { IRoundRepository } from '#/Round/Domain/RoundRepository.js'

const makeRoundRepo = (): IRoundRepository => ({
  findById: vi.fn(),
  findByGameId: vi.fn(),
  findClosingWithDeadlineAfter: vi.fn(),
  save: vi.fn(),
})

const makeRound = (): RoundAggregate =>
  RoundAggregate.create(
    new RoundIdVo('round-id-1'),
    new GameIdVo('game-id-1'),
    1,
    new RoundLetterVo('A'),
    [new PlayerIdVo('player-1')],
  )

describe('CloseRoundService', () => {
  let roundRepo: IRoundRepository
  let service: CloseRoundService

  beforeEach(() => {
    roundRepo = makeRoundRepo()
    service = new CloseRoundService(roundRepo)
    vi.mocked(roundRepo.save).mockResolvedValue()
  })

  it('closes the round and transitions status to finished', async () => {
    const round = makeRound()
    vi.mocked(roundRepo.findById).mockResolvedValue(round)

    await service.execute(new CloseRoundCommand('round-id-1'))

    expect(round.status).toBe(RoundStatus.finished)
    expect(roundRepo.save).toHaveBeenCalledOnce()
  })

  it('returns flat closedAnswers including all players', async () => {
    const round = makeRound()
    round.submitAnswers(new PlayerIdVo('player-1'), new Map([['cat-1', 'Poland']]))
    vi.mocked(roundRepo.findById).mockResolvedValue(round)

    const result = await service.execute(new CloseRoundCommand('round-id-1'))

    expect(result.closedAnswers).toHaveLength(1)
    expect(result.closedAnswers[0]).toEqual({
      playerId: 'player-1',
      categoryId: 'cat-1',
      value: 'Poland',
    })
  })

  it('is idempotent: already-finished round returns answers without re-closing', async () => {
    const round = makeRound()
    round.close()
    vi.mocked(roundRepo.findById).mockResolvedValue(round)

    await expect(service.execute(new CloseRoundCommand('round-id-1'))).resolves.not.toThrow()
    expect(roundRepo.save).not.toHaveBeenCalled()
  })

  it('returns empty closedAnswers for players who never submitted', async () => {
    const round = makeRound()
    vi.mocked(roundRepo.findById).mockResolvedValue(round)

    const result = await service.execute(new CloseRoundCommand('round-id-1'))

    expect(result.closedAnswers).toHaveLength(0)
  })

  it('throws NotFoundError when round does not exist', async () => {
    vi.mocked(roundRepo.findById).mockResolvedValue(null)

    await expect(service.execute(new CloseRoundCommand('round-id-1'))).rejects.toThrow(
      NotFoundError,
    )
  })
})
