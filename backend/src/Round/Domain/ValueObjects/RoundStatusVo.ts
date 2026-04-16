// === src/Round/Domain/ValueObjects/RoundStatusVo.ts ===

export const RoundStatus = {
  answering: 'answering',
  closing: 'closing',
  finished: 'finished',
} as const

export type RoundStatus = (typeof RoundStatus)[keyof typeof RoundStatus]
