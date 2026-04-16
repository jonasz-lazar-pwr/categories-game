// === src/Game/Application/ReadDto/GamePublicDto.ts ===

export interface IPublicPlayerView {
  nick: string
  isHost: boolean
  isConnected: boolean
}

export interface IPublicCategoryView {
  categoryId: string
  name: string
}

export class GamePublicDto {
  public constructor(
    public readonly id: string,
    public readonly code: string,
    public readonly status: string,
    public readonly hostPlayerId: string,
    public readonly roundCount: number,
    public readonly currentRoundNumber: number,
    public readonly categories: IPublicCategoryView[],
    public readonly players: IPublicPlayerView[],
  ) {}
}
