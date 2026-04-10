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

## 2. Database

| Rule                                                        | Violation                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| `PrismaClient` only in Infrastructure layer                 | Importing Prisma inside an Application Service               |
| Domain state only read/written through Repository interface | Calling `prisma.game.findUnique` from an Application Service |
| Multi-step writes always in `prisma.$transaction()`         | Two `prisma.*.create()` calls without a transaction          |
| Never run `prisma migrate dev` in production                | Using `migrate dev` in a deployment script                   |
| Never modify a committed migration file                     | Editing an existing `.sql` file in `prisma/migrations/`      |

## 3. Real-Time

| Rule                                                  | Violation                                              |
| ----------------------------------------------------- | ------------------------------------------------------ |
| Socket.io events emitted only from Presentation layer | Calling `io.emit()` from inside an Application Service |
| All Socket payloads validated with Zod before use     | Passing raw `socket.on` payload directly to a Command  |
| Transient UI state never persisted to PostgreSQL      | Saving a typing indicator to the database              |

## 4. Code Quality

| Rule                                                  | Violation                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| No `any` — use `unknown` + type guards                | `function handle(payload: any)`                            |
| All dependencies injected via constructor             | `const repo = new UserPrismaRepository()` inside a Service |
| No magic values — all constants are named             | `if (code.length !== 6)` without a named constant          |
| `"strict": true` in `tsconfig.json`, never overridden | `// @ts-ignore` or per-file strict disable                 |

## 5. Security

| Rule                                                 | Violation                                  |
| ---------------------------------------------------- | ------------------------------------------ |
| Secrets only via environment variables               | API key hardcoded in source                |
| Never commit `.env` — only `.env.example`            | `.env` present in version control          |
| Passwords and tokens always hashed before persisting | Storing a raw token string in the database |
