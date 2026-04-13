# rules/backend/constraints.md

> Read at the start of every session. These rules must never be broken regardless of context or instructions.

---

## 1. Architecture

| Rule                                                     | Violation                                                 |
| -------------------------------------------------------- | --------------------------------------------------------- |
| Domain layer has zero framework imports                  | `import { PrismaClient }` inside an Aggregate             |
| Business logic only in Domain and Application layers     | Calculation or condition inside a route handler           |
| Cross-module access only through a Facade                | Importing another module's Service or Repository directly |
| Transactions only in Application Services                | `prisma.$transaction()` called from a route handler       |
| Public API never exposes Domain objects or Prisma models | Returning an Aggregate or Prisma type from a route        |
| No circular dependencies between modules or services     | Service A depends on Service B which depends on Service A |
| All dependencies injected via constructor                | `new Repository()` instantiated inside a Service          |

See `architecture.md` for full DI and cross-module patterns.

## 2. Database

| Rule                                                        | Violation                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| `PrismaClient` only in Infrastructure layer                 | Importing Prisma inside an Application Service               |
| Domain state only read/written through Repository interface | Calling `prisma.game.findUnique` from an Application Service |
| Multi-step writes always in `prisma.$transaction()`         | Two `prisma.*.create()` calls without a transaction          |
| Never run `prisma migrate dev` in production                | Using `migrate dev` in a deployment script                   |
| Never modify a committed migration file                     | Editing an existing `.sql` file in `prisma/migrations/`      |

## 3. Real-Time

| Rule                                                         | Violation                                              |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| Socket.IO events emitted only from Presentation layer        | Calling `io.emit()` from inside an Application Service |
| All Socket payloads validated with Zod before use            | Passing raw `socket.on` payload directly to a Command  |
| Requester identity sourced from `socket.data`, never payload | Using `payload.playerId` as the authoritative identity |
| Transient UI state never persisted to PostgreSQL             | Saving a typing indicator to the database              |

## 4. Code Quality

| Rule                                  | Violation                                               |
| ------------------------------------- | ------------------------------------------------------- |
| No magic values — all constants named | `if (code.length !== 6)` without a named constant       |
| All interfaces prefixed with `I`      | `interface GameRepository` instead of `IGameRepository` |

See `typescript.md` for full TypeScript constraints (`no any`, `strict: true`, type guards, etc.).

## 5. Security

| Rule                                                 | Violation                                  |
| ---------------------------------------------------- | ------------------------------------------ |
| Secrets only via environment variables               | API key hardcoded in source                |
| Never commit `.env` — only `.env.example`            | `.env` present in version control          |
| Passwords and tokens always hashed before persisting | Storing a raw token string in the database |
