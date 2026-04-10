# CLAUDE.md

> Read this entire file before writing any code, making suggestions, or answering questions about this codebase. Then read every file listed in the **See Also** section.

Real-time multiplayer word game ("Państwa Miasta" / Categories). Players join a lobby with a code, fill in answers across categories for a drawn letter, then vote on each other's answers with AI-assisted verification.

---

## Project Structure

```
categories-game/
├── backend/        # Node.js 22, Fastify 5, Socket.IO 4, Prisma 7, PostgreSQL 17
├── frontend/       # Vue 3, Pinia, Vue Router 5, Tailwind CSS v4, Vite
└── infra/          # Docker Compose configs and .env files
```

Both workspaces use TypeScript 6 with `"strict": true`.

---

## Backend

### Domain Structure

```
src/
├── Identity/       # User accounts, authentication, profile
├── Game/           # Game lifecycle, lobby, configuration, players, categories
├── Round/          # Round flow, letter drawing, answer collection, timer
├── Scoring/        # Verification, voting, AI integration, scoring
├── Presentation/   # All HTTP routes and Socket handlers — split by domain internally
└── shared/
    ├── errors/     # InvalidArgumentError, NotFoundError
    └── types/
```

### Key Facts

- Path alias `#/` maps to `src/` — e.g. `import { GameAggregate } from '#/Game/Domain/GameAggregate.js'`
- Imports require `.js` extension — required by `moduleResolution: nodenext`
- All dependencies wired manually in `src/bootstrap.ts` — no IoC container
- Prisma schema split across `backend/prisma/*.prisma` files
- `backend/generated/` — never committed, run `make generate` after cloning or changing schema

---

## Frontend

### Structure

```
src/
├── components/     # Stateless, reusable UI components
├── composables/    # Logic layer — bridge between components and stores
├── stores/         # Pinia stores, global state
├── views/          # Pages connected to Vue Router
├── services/       # HTTP and Socket.IO communication
├── router/         # Route definitions and guards
├── assets/         # main.css — Tailwind config, design tokens, fonts
├── shared/         # Shared types, constants, utilities
├── App.vue
└── main.ts
```

### Key Facts

- Path alias `@/` maps to `src/` — e.g. `import { useGame } from '@/composables/useGame'`
- Tailwind CSS v4 — no `tailwind.config.js`, all tokens in `src/assets/main.css` under `@theme`
- No `<style>` blocks in any `.vue` file

---

## See Also

> Read these files before working on any feature. They contain hard rules and patterns that must be followed without exception.

### Backend

| File                                    | Contents                                                                   |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `.claude/rules/backend/architecture.md` | Layers, CQRS flows, DDD building blocks, cross-cutting patterns            |
| `.claude/rules/backend/constraints.md`  | Hard rules — never break these                                             |
| `.claude/rules/backend/standards.md`    | Naming conventions, file structure, class structure                        |
| `.claude/rules/backend/database.md`     | Prisma schema conventions, migrations, repository and transaction patterns |

### Frontend

| File                                     | Contents                                                  |
| ---------------------------------------- | --------------------------------------------------------- |
| `.claude/rules/frontend/architecture.md` | Layers, data flow, Vue 3 patterns                         |
| `.claude/rules/frontend/constraints.md`  | Hard rules — never break these                            |
| `.claude/rules/frontend/standards.md`    | Naming conventions, SFC structure, file structure         |
| `.claude/rules/frontend/styling.md`      | Tailwind v4, design tokens, animations, responsive design |

### Shared

| File                                 | Contents                                                         |
| ------------------------------------ | ---------------------------------------------------------------- |
| `.claude/rules/shared/typescript.md` | TypeScript rules applied to all code in both workspaces          |
| `.claude/rules/shared/testing.md`    | Testing strategy, tooling, and patterns for backend and frontend |
| `.claude/rules/shared/commands.md`   | All Make commands with descriptions and first-time setup         |
| `.claude/rules/shared/git.md`        | Branch naming, commit format, and rules                          |
