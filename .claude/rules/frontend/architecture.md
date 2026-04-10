# rules/frontend/architecture.md

> Read before implementing any feature. Defines layers, data flow, and Vue 3 patterns.

---

## 1. Layers

Dependencies flow strictly downward.

| Layer       | Responsibility                                 | May import from                |
| ----------- | ---------------------------------------------- | ------------------------------ |
| Views       | Compose components, read state via composables | Composables, Components        |
| Components  | Render UI, emit events                         | Nothing — stateless by default |
| Composables | Logic, side effects, store orchestration       | Stores, Services               |
| Stores      | Global state and actions                       | Services                       |
| Services    | HTTP and Socket.io communication               | Nothing Vue-specific           |

## 2. Data Flow

Props flow down, events flow up. State shared across multiple components lives in a Pinia store, accessed through a composable.

```vue
<script setup lang="ts">
const { players, submitAnswer } = useRound()
</script>

<template>
  <PlayerCard
    v-for="player in players"
    :key="player.id"
    :player="player"
    @answer-submitted="submitAnswer"
  />
</template>
```

## 3. Composables

The logic layer — bridge between components and stores. Each composable owns one domain concern. Returns only what the caller needs — never the full store.

```ts
// === src/composables/useRound.ts ===

export function useRound() {
  const store = useRoundStore()
  const { socket } = useSocket()

  const submitAnswer = (value: string): void => {
    socket.emit('submit_answer', { category: store.currentCategory, value })
  }

  return {
    players: computed(() => store.players),
    currentLetter: computed(() => store.currentLetter),
    submitAnswer,
  }
}
```

## 4. Pinia Stores

One store per domain. Use setup store syntax — never the options object form. Stores hold state and define actions — no UI logic, no calls to other stores.

```ts
// === src/stores/round.ts ===

export const useRoundStore = defineStore('round', () => {
  const players = ref<Player[]>([])
  const currentLetter = ref<string | null>(null)
  const status = ref<RoundStatus>('waiting')

  function setPlayers(incoming: Player[]): void {
    players.value = incoming
  }

  function startRound(letter: string): void {
    currentLetter.value = letter
    status.value = 'active'
  }

  return { players, currentLetter, status, setPlayers, startRound }
})
```

## 5. Services

Pure functions — no Vue, no Pinia, no composables. Testable in isolation.

All HTTP communication goes through a single `src/services/http.ts` client — never call `fetch` directly in a service. The HTTP client handles base URL, headers, and error handling in one place.

```ts
// === src/services/http.ts ===

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export const http = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
```

Services use the HTTP client — never raw `fetch`:

```ts
// === src/services/exampleService.ts ===

export const exampleService = {
  async create(payload: CreateExamplePayload): Promise<{ id: string }> {
    return http.post<{ id: string }>('/examples', payload)
  },
}
```

## 6. Socket.io

Single connection in `useSocket`. Receives events and dispatches to stores. Initialised once in `App.vue`.

```ts
// === src/composables/useSocket.ts ===

const socket = io(import.meta.env.VITE_SOCKET_URL)

export function useSocket() {
  const roundStore = useRoundStore()

  socket.on('round_started', (payload: RoundStartedPayload) => {
    roundStore.startRound(payload.letter)
  })

  return { socket }
}
```

## 7. Vue Router

Views lazy-loaded by default. Navigation guards in `src/router/guards.ts` — never inline beyond a single function reference.

```ts
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/views/HomeView.vue'),
  },
  {
    path: '/lobby/:code',
    component: () => import('@/views/LobbyView.vue'),
    beforeEnter: requireValidCode,
  },
]
```
