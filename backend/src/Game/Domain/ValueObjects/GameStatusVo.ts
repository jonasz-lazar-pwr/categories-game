// === src/Game/Domain/ValueObjects/GameStatusVo.ts ===

export const GameStatus = {
  lobby: 'lobby',
  active: 'active',
  finished: 'finished',
  cancelled: 'cancelled',
} as const

export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus]
