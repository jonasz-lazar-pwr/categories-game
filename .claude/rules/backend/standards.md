# rules/backend/standards.md

> Read at the start of every session. Defines code conventions, naming, and file structure for all backend code.

---

## 1. Universal Principles

| Principle              | In practice                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| Single Responsibility  | One class, one reason to change — if "and" describes it, split it     |
| Fail early             | Validate and throw at the top of a method, not buried in conditionals |
| Self-documenting names | Names communicate intent — if a comment is needed, rename instead     |
| No magic values        | Every constant and limit is named and centralised                     |
| Short methods          | If a method exceeds one screen, extract private helpers               |

## 2. File Headers

Every file starts with a path comment:

```ts
// === src/Module/Layer/ClassName.ts ===
```

JSON files do not support comments — no header required.

## 3. Comments

Default: no comments. Code must be self-explanatory through naming and structure.

One permitted use: section headers in long classes with many members.

```ts
// === Private Helpers ===
```

Never use comments to explain what the code does. Rename or extract instead.

## 4. Class Structure

Members in this order. Use section headers only when a class has many members.

```ts
export class ExampleService {
  // === Constants ===
  private static readonly MAX_ITEMS = 100

  // === Properties ===
  private readonly repository: ExampleRepository

  // === Constructor ===
  public constructor(repository: ExampleRepository) {
    this.repository = repository
  }

  // === Public Methods ===
  public async execute(command: ExampleCommand): Promise<void> { ... }

  // === Private Helpers ===
  private validate(command: ExampleCommand): void { ... }
}
```

Within each visibility group: `public` → `protected` → `private`. Constructor always first among methods.

**Every method and constructor must have an explicit accessibility modifier — `public`, `protected`, or `private`. Never omit it.**

```ts
// Correct
public constructor(value: string) { ... }
public execute(): void { ... }
private validate(): void { ... }

// Wrong — missing accessibility modifier
constructor(value: string) { ... }
execute(): void { ... }
```

## 5. Naming Conventions

| Concept                   | Pattern             | Example                    |
| ------------------------- | ------------------- | -------------------------- |
| Aggregate                 | `*Aggregate`        | `OrderAggregate`           |
| Value Object              | `*Vo`               | `OrderIdVo`, `UserEmailVo` |
| Command DTO               | `*Command`          | `CreateOrderCommand`       |
| Command Service           | `*Service`          | `CreateOrderService`       |
| Query interface           | `*Query`            | `GetOrderQuery`            |
| Query implementation      | `*PrismaQuery`      | `GetOrderPrismaQuery`      |
| Repository interface      | `*Repository`       | `OrderRepository`          |
| Repository implementation | `*PrismaRepository` | `OrderPrismaRepository`    |
| Read DTO                  | `*Dto`              | `OrderDetailDto`           |
| View Object               | `*View`             | `OrderSummaryView`         |
| Facade                    | `*Facade`           | `OrderFacade`              |
| HTTP route handler        | `*Route`            | `createOrderRoute`         |
| Socket event handler      | `*Handler`          | `submitAnswerHandler`      |

## 6. Module Structure

Each domain module follows this layout:

```
Module/
├── Application/
│   ├── CommandDto/       ← *Command
│   ├── ReadDto/          ← *Dto
│   ├── View/             ← *View
│   ├── *Service.ts       ← directly in Application/
│   └── *Query.ts         ← directly in Application/
├── Domain/
│   ├── *Aggregate.ts     ← directly in Domain/
│   ├── *Repository.ts    ← directly in Domain/
│   └── ValueObjects/     ← *Vo
└── Infrastructure/
    ├── Prisma/           ← *PrismaRepository, *PrismaQuery
    └── *Service.ts       ← e.g. PasswordService, JwtService
```

Presentation is a top-level directory alongside domain modules, split internally by domain:

```
Presentation/
├── Identity/
│   ├── *Route.ts
│   ├── *Middleware.ts
│   └── __tests__/
├── Game/
├── Round/
└── Scoring/
```

Tests for Domain and Application layers are co-located with their source in `__tests__/` folders.

## 7. Error Classes

Two base classes in `src/shared/errors/` — no other error classes at application level:

| Class                  | When to use                                    |
| ---------------------- | ---------------------------------------------- |
| `InvalidArgumentError` | Invalid input, duplicate, constraint violation |
| `NotFoundError`        | Aggregate or record not found                  |

Domain throws on invalid state. Application Services throw on constraint violations requiring a repository check. Presentation catches and maps to HTTP status codes or Socket error events.
