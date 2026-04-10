# rules/shared/testing.md

> Read before writing any test. Defines testing strategy, tooling, and patterns for backend and frontend.

---

## 1. Strategy

Two levels — each with a distinct purpose:

| Level | What it tests                         | Speed        | Tools               |
| ----- | ------------------------------------- | ------------ | ------------------- |
| Unit  | Single class or function in isolation | Milliseconds | Vitest              |
| E2E   | Full user flow through the UI         | Minutes      | Playwright (future) |

## 2. What to Test

### Backend

| What                         | Level |
| ---------------------------- | ----- |
| Aggregates and Value Objects | Unit  |
| Domain Services              | Unit  |
| Application Services         | Unit  |
| Route and Socket handlers    | Unit  |

### Frontend

| What         | Level |
| ------------ | ----- |
| Composables  | Unit  |
| Pinia stores | Unit  |
| Components   | Unit  |

## 3. File Conventions

Tests are co-located with their source files in a `__tests__/` folder — never in a separate top-level `tests/` directory.

```
src/
└── Module/
    ├── SourceFile.ts
    └── __tests__/
        └── SourceFile.spec.ts
```

## 4. Unit Tests — Backend

Test Domain objects in complete isolation. Never call the real database — mock all infrastructure with `vi.fn()`.

```ts
describe('ExampleAggregate', () => {
  it('throws InvalidArgumentError when code is invalid', () => {
    expect(() => ExampleAggregate.create(id, '')).toThrow(InvalidArgumentError)
  })
})
```

Mock repositories on their interface methods — never on the concrete implementation:

```ts
const mockRepository = {
  findById: vi.fn(),
  save: vi.fn(),
}
```

Route handler tests use `fastify.inject()` — no real HTTP server needed:

```ts
const app = Fastify()
await app.register(cookie)
app.register(exampleRoute(mockService))
const response = await app.inject({ method: 'POST', url: '/example', payload: { ... } })
expect(response.statusCode).toBe(201)
```

Each test creates a fresh `Fastify()` instance so routes don't bleed between tests.

## 5. Unit Tests — Frontend

### Pinia Stores

Use `setActivePinia(createPinia())` in `beforeEach` to get a fresh store instance for each test:

```ts
describe('useExampleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with correct default state', () => {
    const store = useExampleStore()
    expect(store.value).toBeNull()
  })
})
```

### Components

Use `createTestingPinia` from `@pinia/testing` — it stubs all store actions by default, allowing components and stores to be tested separately:

```ts
mount(ExampleComponent, {
  global: {
    plugins: [
      createTestingPinia({
        createSpy: vi.fn,
        initialState: { example: { value: 'test' } },
      }),
    ],
  },
})
```

Use `data-testid` attributes for element selection — never CSS classes or text content:

```vue
<button data-testid="submit-button">Submit</button>
```

```ts
wrapper.find('[data-testid="submit-button"]')
```

## 6. Mocking

| What                                   | How                             |
| -------------------------------------- | ------------------------------- |
| Repository in Application Service test | `vi.fn()` on interface methods  |
| HTTP calls in service test             | `vi.mock` on the service module |
| Pinia store in component test          | `createTestingPinia`            |
| Pinia store in store unit test         | `setActivePinia(createPinia())` |

Never mock Domain logic — if you feel the need to mock an Aggregate or Value Object, the test structure is wrong.

## 7. Test Naming

```ts
it('throws InvalidArgumentError when code is shorter than 6 characters', ...)
it('returns null when record does not exist', ...)
it('emits submit event when form is valid', ...)
```

Avoid vague names: `it('works')`, `it('test 1')`, `it('handles error')`.

## 8. Running Tests

```bash
make test     # unit tests — backend and frontend
```
