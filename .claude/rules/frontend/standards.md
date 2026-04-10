# rules/frontend/standards.md

> Read at the start of every session. Defines code conventions, naming, and file structure for all frontend code.

---

## 1. Universal Principles

| Principle             | In practice                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| Single Responsibility | One component, one visual concern — if "and" describes it, split it          |
| Stateless by default  | Components receive props and emit events — local state only when unavoidable |
| Short templates       | If a template exceeds one screen, extract child components                   |

## 2. File Headers

Every `.ts` file starts with a path comment:

```ts
// === src/composables/useExample.ts ===
```

`.vue` files and JSON files do not use file headers.

## 3. Naming Conventions

| Concept        | Pattern                      | Example                            |
| -------------- | ---------------------------- | ---------------------------------- |
| Component file | `PascalCase.vue`             | `GameLobby.vue`, `PlayerCard.vue`  |
| View file      | `PascalCase.vue` in `views/` | `LobbyView.vue`, `GameView.vue`    |
| Composable     | `useNoun`                    | `useGame`, `useSocket`, `useRound` |
| Pinia store    | `useNounStore`               | `useGameStore`, `usePlayerStore`   |
| Service        | `nounService`                | `gameService`, `answerService`     |
| Emitted event  | `kebab-case`                 | `update:value`, `answer-submitted` |

## 4. SFC Structure

Blocks always in this order: `<script setup>` → `<template>` → `<style scoped>`.

Within `<script setup>`, members in this order:

1. Imports
2. Props and emits
3. Composables
4. Local state (`ref`, `reactive`)
5. Computed properties
6. Functions
7. Lifecycle hooks

## 5. Props and Emits

Always typed with generics — never untyped string arrays.

```vue
<script setup lang="ts">
interface Props {
  playerId: string
  score: number
  isHost?: boolean
}

interface Emits {
  (e: 'answer-submitted', value: string): void
  (e: 'update:modelValue', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>
```

## 6. File Structure

```
src/
├── components/       ← reusable, stateless components
├── composables/      ← logic, side effects, Socket.io
├── stores/           ← Pinia stores, global state
├── views/            ← pages connected to Vue Router
├── services/         ← HTTP and Socket.io communication
├── router/           ← route definitions and guards
├── assets/           ← main.css, fonts, images
├── shared/           ← shared types, constants, utilities
├── App.vue
└── main.ts
```

Components grouped by domain when the project grows:

```
components/
├── game/
│   └── PlayerCard.vue
└── round/
    └── AnswerInput.vue
```
