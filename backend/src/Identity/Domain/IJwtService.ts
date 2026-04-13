// === src/Identity/Domain/IJwtService.ts ===

export interface IJwtService {
  signAccess(userId: string): string
  signRefresh(userId: string): string
  verifyAccess(token: string): string
  verifyRefresh(token: string): string
}
