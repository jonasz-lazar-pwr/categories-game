// === src/Game/Domain/CategoryRepository.ts ===

import type { CategoryEntity } from '#/Game/Domain/CategoryEntity.js'
import type { CategoryIdVo } from '#/Game/Domain/ValueObjects/CategoryIdVo.js'

export interface ICategoryRepository {
  findAllDefault(): Promise<CategoryEntity[]>
  findById(id: CategoryIdVo): Promise<CategoryEntity | null>
  save(category: CategoryEntity): Promise<void>
}
