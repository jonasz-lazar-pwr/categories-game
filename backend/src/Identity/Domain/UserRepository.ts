// === src/Identity/Domain/UserRepository.ts ===

import type { UserAggregate } from '#/Identity/Domain/UserAggregate.js'
import type { UserIdVo } from '#/Identity/Domain/ValueObjects/UserIdVo.js'
import type { UserEmailVo } from '#/Identity/Domain/ValueObjects/UserEmailVo.js'

export interface IUserRepository {
  findById(id: UserIdVo): Promise<UserAggregate | null>
  findByEmail(email: UserEmailVo): Promise<UserAggregate | null>
  save(user: UserAggregate): Promise<void>
}
