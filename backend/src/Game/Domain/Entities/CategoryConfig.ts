// === src/Game/Domain/Entities/CategoryConfig.ts ===

import type { CategoryIdVo } from '#/Game/Domain/ValueObjects/CategoryIdVo.js'

export class CategoryConfig {
  public constructor(
    public readonly categoryId: CategoryIdVo,
    public readonly name: string,
    public readonly description: string,
  ) {}
}
