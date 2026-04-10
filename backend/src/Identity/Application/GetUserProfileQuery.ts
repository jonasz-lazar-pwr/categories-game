// === src/Identity/Application/GetUserProfileQuery.ts ===

import type { GetUserProfileDto } from '#/Identity/Application/ReadDto/GetUserProfileDto.js'

export interface GetUserProfileQuery {
  execute(userId: string): Promise<GetUserProfileDto | null>
}
