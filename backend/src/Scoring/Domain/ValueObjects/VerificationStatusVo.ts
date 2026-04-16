// === src/Scoring/Domain/ValueObjects/VerificationStatusVo.ts ===

export const VerificationStatus = {
  ai_processing: 'ai_processing',
  in_progress: 'in_progress',
  finished: 'finished',
} as const

export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus]
