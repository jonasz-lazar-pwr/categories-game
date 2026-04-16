// === src/Round/Application/GetCurrentRoundQuery.ts ===

import type { RoundStateView } from '#/Round/Application/ReadDto/RoundStateView.js'

export interface IGetCurrentRoundQuery {
  execute(gameId: string): Promise<RoundStateView | null>
}
