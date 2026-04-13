// === src/Game/Application/View/PlayerInLobbyView.ts ===

export class PlayerInLobbyView {
  public constructor(
    public readonly playerId: string,
    public readonly nick: string,
    public readonly isHost: boolean,
    public readonly isConnected: boolean,
  ) {}
}
