// === src/Game/Infrastructure/Prisma/CategoryPrismaRepository.ts ===

import { CategoryEntity } from '#/Game/Domain/CategoryEntity.js'
import { CategoryIdVo } from '#/Game/Domain/ValueObjects/CategoryIdVo.js'
import type { ICategoryRepository } from '#/Game/Domain/CategoryRepository.js'
import type { PrismaClient } from '#generated/prisma/client.js'

export class CategoryPrismaRepository implements ICategoryRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findAllDefault(): Promise<CategoryEntity[]> {
    const rows = await this.prisma.category.findMany({ where: { isDefault: true } })
    return rows.map((r) => this.toEntity(r))
  }

  public async findById(id: CategoryIdVo): Promise<CategoryEntity | null> {
    const raw = await this.prisma.category.findUnique({ where: { id: id.value } })
    if (raw === null) return null
    return this.toEntity(raw)
  }

  public async save(category: CategoryEntity): Promise<void> {
    await this.prisma.category.upsert({
      where: { id: category.id.value },
      create: {
        id: category.id.value,
        name: category.name,
        description: category.description,
        isDefault: category.isDefault,
      },
      update: {
        name: category.name,
        description: category.description,
        isDefault: category.isDefault,
      },
    })
  }

  // === Private Helpers ===

  private toEntity(raw: {
    id: string
    name: string
    description: string
    isDefault: boolean
  }): CategoryEntity {
    return CategoryEntity.restore(
      new CategoryIdVo(raw.id),
      raw.name,
      raw.description,
      raw.isDefault,
    )
  }
}
