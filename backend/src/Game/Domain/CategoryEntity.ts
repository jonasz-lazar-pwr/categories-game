// === src/Game/Domain/CategoryEntity.ts ===

import { InvalidArgumentError } from '#/shared/errors/InvalidArgumentError.js'
import type { CategoryIdVo } from '#/Game/Domain/ValueObjects/CategoryIdVo.js'

export class CategoryEntity {
  private constructor(
    public readonly id: CategoryIdVo,
    public readonly name: string,
    public readonly description: string,
    public readonly isDefault: boolean,
  ) {}

  public static create(
    id: CategoryIdVo,
    name: string,
    description: string,
    isDefault: boolean,
  ): CategoryEntity {
    if (!name.trim()) throw new InvalidArgumentError('Category name cannot be empty.')
    if (!description.trim()) throw new InvalidArgumentError('Category description cannot be empty.')
    return new CategoryEntity(id, name, description, isDefault)
  }

  public static restore(
    id: CategoryIdVo,
    name: string,
    description: string,
    isDefault: boolean,
  ): CategoryEntity {
    return new CategoryEntity(id, name, description, isDefault)
  }
}
