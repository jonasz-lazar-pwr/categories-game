// === src/Presentation/shared/socketData.ts ===

export interface ISocketData {
  gameId: string
  playerId: string
  isHost: boolean
}

export function isSocketData(value: unknown): value is ISocketData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'gameId' in value &&
    typeof (value as Record<string, unknown>)['gameId'] === 'string' &&
    'playerId' in value &&
    typeof (value as Record<string, unknown>)['playerId'] === 'string' &&
    'isHost' in value &&
    typeof (value as Record<string, unknown>)['isHost'] === 'boolean'
  )
}
