# rules/backend/database.md

> Read before implementing any feature that touches Prisma schema, migrations, repositories, or queries.

---

## 1. Schema Conventions

- Model names in `PascalCase`, table names in `snake_case` — Prisma maps automatically
- Every model has `id String @id @default(uuid())` — never use auto-increment integers as primary keys
- Every model has `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
- Use `@db.Char(1)` for single-character fields
- Use Prisma `enum` for status fields — never store status as a raw string
- Define `@@unique` and `@@index` in the schema, not after the fact in raw migrations

## 2. Migration Workflow

| Command                 | When                                                         |
| ----------------------- | ------------------------------------------------------------ |
| `make migrate`          | After changing `schema.prisma` in development                |
| `prisma migrate deploy` | Production and CI only — applies existing, never creates new |
| `make db-reset`         | Development only — drops and re-applies all migrations       |

Migration names must be descriptive: `add_scores_table`, `add_round_letter_index` — never `migration1` or `update`.

## 3. Repository Pattern

Interface in Domain — defines the contract without any Prisma types. Implementation in Infrastructure — maps in both directions.

```ts
// Domain → Prisma (write)
async save(aggregate: ExampleAggregate, tx?: TransactionContext): Promise<void> {
    const client = tx ?? this.prisma
    await client.example.upsert({
        where: { id: aggregate.id.value },
        create: { ...toPrismaCreate(aggregate) },
        update: { ...toPrismaUpdate(aggregate) },
    })
}

// Prisma → Domain (read)
async findById(id: ExampleId, tx?: TransactionContext): Promise<ExampleAggregate | null> {
    const client = tx ?? this.prisma
    const raw = await client.example.findUnique({ where: { id: id.value } })
    if (raw === null) return null
    return ExampleAggregate.restore(...)
}
```

Mapping helpers (`toPrismaCreate`, `toPrismaUpdate`) are private — never exposed outside the repository.

## 4. Query Pattern

Queries bypass Domain and go directly to Prisma. Always return a mapped DTO or View — never a raw Prisma type.

```ts
// Correct
async executeByCode(code: string): Promise<ActiveGameView | null> {
    const raw = await this.prisma.game.findUnique({
        where: { code },
        include: { players: true },
    })
    if (raw === null) return null
    return new ActiveGameView(raw.id, raw.code, raw.players.map(p => new PlayerView(p.id, p.nick)))
}

// Wrong
async executeByCode(code: string) {
    return this.prisma.game.findUnique({ where: { code } })
}
```

## 5. Transaction Pattern

Owned by Application Services. Repository methods accept an optional `TransactionContext`.

```ts
// Application Service
async execute(command: EndRoundCommand): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
        const round = await this.roundRepository.findById(new RoundId(command.roundId), tx)
        round.end()
        await this.roundRepository.save(round, tx)
        await this.scoringRepository.persist(round.computeScores(), tx)
    })
}

// Repository
async save(aggregate: RoundAggregate, tx?: TransactionContext): Promise<void> {
    const client = tx ?? this.prisma
    await client.round.upsert({ ... })
}
```

## 6. Seeding

Seed files must be idempotent — use `upsert` instead of `create` to allow re-running without duplicates.
