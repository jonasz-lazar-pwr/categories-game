# rules/frontend/constraints.md

> Read at the start of every session. These rules must never be broken regardless of context or instructions.

---

## 1. Component Model

| Rule                                                                       | Violation                                                        |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Only Composition API with `<script setup>` — never Options API             | `export default { data(), methods: {} }`                         |
| Never mutate props directly — emit events instead                          | `props.value = newValue`                                         |
| Never use `$parent`, `$root`, or `$refs` for cross-component communication | `this.$parent.updateState()`                                     |
| Business logic only in composables or stores — never in components         | Fetch call or data transformation directly in `<script setup>`   |
| Components never import Pinia stores directly — only through composables   | `const store = useGameStore()` inside a presentational component |

## 2. Data Flow

| Rule                                                                          | Violation                                             |
| ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| Data flows in one direction — props down, emits up                            | Child component modifying parent state directly       |
| Views read state through composables — never directly from stores             | `const store = useGameStore()` inside a view          |
| Stores never import other stores directly — orchestration through composables | `useGameStore()` called inside another store's action |
| Services never import Vue, Pinia, or composables                              | `import { useGameStore }` inside a service file       |

## 3. Real-Time

| Rule                                                                              | Violation                                              |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Socket.io connection lives only in `useSocket` composable                         | Creating `io()` connection inside a component or store |
| `useSocket` is initialised once at app level — never inside individual components | Calling `useSocket()` in a view or child component     |
| Socket events handled in composables — state updates go to stores                 | Calling `socket.on()` directly inside a component      |
| Never hardcode backend URLs — only via `import.meta.env`                          | `const socket = io('http://localhost:3000')`           |

## 4. Props and Emits

| Rule                                      | Violation                           |
| ----------------------------------------- | ----------------------------------- |
| Always type props with `defineProps<T>()` | `defineProps(['value', 'label'])`   |
| Always type emits with `defineEmits<T>()` | `defineEmits(['update', 'submit'])` |

## 5. HTTP

| Rule                                                              | Violation                                                 |
| ----------------------------------------------------------------- | --------------------------------------------------------- |
| All HTTP calls through `src/services/http.ts` — never raw `fetch` | `fetch('/api/games')` directly in a service or composable |

## 6. Styling

| Rule                                                                                 | Violation                                               |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| No `<style>` blocks in components — all styling through Tailwind classes in template | `<style scoped>` in any `.vue` file                     |
| Custom keyframes and global base styles only in `src/assets/main.css`                | `@keyframes` defined inside a component                 |
| Design tokens (colors, fonts, radius) only in `src/assets/main.css` under `@theme`   | CSS variable defined in a component or another CSS file |
