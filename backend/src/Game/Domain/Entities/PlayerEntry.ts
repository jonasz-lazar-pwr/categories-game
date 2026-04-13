// === src/Game/Domain/Entities/PlayerEntry.ts ===

import type { PlayerIdVo } from '#/shared/ValueObjects/PlayerIdVo.js'
import type { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'

export class PlayerEntry {
  private _isConnected: boolean
  private _socketId: string | null
  private _score: number

  public constructor(
    public readonly playerId: PlayerIdVo,
    public readonly userId: UserIdVo | null,
    public readonly nick: string,
    public readonly isHost: boolean,
    isConnected: boolean,
    socketId: string | null,
    score: number,
  ) {
    this._isConnected = isConnected
    this._socketId = socketId
    this._score = score
  }

  public get isConnected(): boolean {
    return this._isConnected
  }

  public get socketId(): string | null {
    return this._socketId
  }

  public get score(): number {
    return this._score
  }

  public setConnected(socketId: string | null, isConnected: boolean): void {
    this._socketId = socketId
    this._isConnected = isConnected
  }

  public addScore(points: number): void {
    this._score += points
  }
}
