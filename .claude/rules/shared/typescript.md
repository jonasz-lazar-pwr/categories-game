# rules/shared/typescript.md

> Applies to all TypeScript code in both backend and frontend.

---

## 1. Constraints

| Rule                                                              | Violation                                  |
| ----------------------------------------------------------------- | ------------------------------------------ |
| No `any` — use `unknown` + type guards                            | `function handle(payload: any)`            |
| Always type function parameters and return values                 | Relying on inference for public APIs       |
| `"strict": true` in `tsconfig.json`, never overridden             | `// @ts-ignore` or per-file strict disable |
| No type assertions (`as`) without a preceding type guard          | `const user = data as User`                |
| `readonly` on all properties that don't change after construction | Mutable properties by default              |

## 2. Type vs Interface

| Use case                                                  | Keyword                            |
| --------------------------------------------------------- | ---------------------------------- |
| External data shapes (API payloads, Socket events, props) | `interface`                        |
| Unions and computed types                                 | `type`                             |
| Domain Value Objects and DTOs                             | `class` with `readonly` properties |

```ts
// Correct
interface SubmitAnswerPayload {
  readonly category: string
  readonly value: string
}

type GameStatus = 'waiting' | 'active' | 'finished'

// Wrong
type SubmitAnswerPayload = { category: string; value: string }
```

## 3. Unknown Input

All external input (HTTP body, Socket payload, environment variables) is `unknown` until validated.

```ts
// Correct
function handle(payload: unknown): void {
  const parsed = schema.safeParse(payload)
  if (!parsed.success) throw new InvalidArgumentError('Invalid payload.')
}

// Wrong
function handle(payload: SubmitAnswerPayload): void { ... }
```

## 4. Path Aliases

Always use path aliases instead of relative paths for imports across module boundaries. Relative paths are only acceptable for imports within the same module folder.

**Backend** — alias `#/` maps to `src/`:

```ts
// Correct
import { GameAggregate } from '#/Game/Domain/GameAggregate.js'
import type { CreateGameCommand } from '#/Game/Application/Command/CreateGameCommand.js'

// Wrong
import { GameAggregate } from '../../../Game/Domain/GameAggregate.js'
```

**Frontend** — alias `@/` maps to `src/`:

```ts
// Correct
import { useGame } from '@/composables/useGame'
import type { Player } from '@/shared/types'

// Wrong
import { useGame } from '../../../composables/useGame'
```

> Backend imports require the `.js` extension — required by `moduleResolution: nodenext`. Frontend imports do not require extensions — resolved by Vite.

## 5. Type Guards

Prefer type guards over type assertions. A type guard is a function that returns `value is T`.

```ts
// Correct
function isSubmitAnswerPayload(value: unknown): value is SubmitAnswerPayload {
  return typeof value === 'object' && value !== null && 'category' in value && 'value' in value
}

// Wrong
const payload = data as SubmitAnswerPayload
```
