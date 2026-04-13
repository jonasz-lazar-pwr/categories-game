# rules/backend/architecture.md

> Read before implementing any feature. Defines layers, CQRS flows, DDD building blocks, and cross-cutting patterns.

---

## 1. Layers

Dependencies flow strictly downward — no layer imports from a layer above it.

| Layer          | Responsibility                       | May import from                   |
| -------------- | ------------------------------------ | --------------------------------- |
| Presentation   | Parse input, delegate, return output | Application only                  |
| Application    | Orchestrate write and read flows     | Domain, Infrastructure interfaces |
| Domain         | Business rules and invariants        | Nothing outside own module        |
| Infrastructure | Prisma, external APIs, persistence   | Domain interfaces only            |

## 2. CQRS

Two flows — never mixed in one method.

|                 | Write                            | Read                             |
| --------------- | -------------------------------- | -------------------------------- |
| Entry           | `*Command` DTO                   | `*Query` call                    |
| Passes through  | Service → Aggregate → Repository | Query impl → Prisma → DTO / View |
| Modifies state  | Yes                              | Never                            |
| Returns         | `void` or new ID                 | DTO or View Object               |
| Domain involved | Always                           | Never                            |

**Read DTO vs View Object:**

|          | Read DTO (`*Dto`)                | View Object (`*View`)                  |
| -------- | -------------------------------- | -------------------------------------- |
| Used for | Single object, fetch after write | Collection or context-specific display |
| Fields   | Full object data                 | Only what the consumer needs           |

## 3. Aggregates

Enforces invariants and is the transaction boundary. One aggregate per transaction. All state transitions through aggregate methods — never by direct property assignment from outside.

Two static constructors by convention:

| Constructor           | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `static create(...)`  | New aggregate — validates all invariants         |
| `static restore(...)` | Rehydrated from persistence — trusts stored data |

```ts
export class OrderAggregate {
  private constructor(
    public readonly id: OrderIdVo,
    private status: OrderStatus,
  ) {}

  public static create(id: OrderIdVo, code: string): OrderAggregate {
    if (code.length !== ORDER_CODE_LENGTH)
      throw new InvalidArgumentError('Code must be 6 characters.')
    return new OrderAggregate(id, OrderStatus.Pending)
  }

  public static restore(id: OrderIdVo, status: OrderStatus): OrderAggregate {
    return new OrderAggregate(id, status)
  }

  public confirm(): void {
    if (this.status !== OrderStatus.Pending) {
      throw new InvalidArgumentError('Only pending orders can be confirmed.')
    }
    this.status = OrderStatus.Confirmed
  }
}
```

## 4. Value Objects

Immutable, no identity, defined by value. Validates in constructor. No side effects — never generates IDs or calls services.

```ts
export class UserEmailVo {
  public constructor(public readonly value: string) {
    if (!value.includes('@')) throw new InvalidArgumentError('Invalid email.')
  }
}

// Wrong — side effect inside Value Object
public static generate(): OrderCodeVo { return new OrderCodeVo(crypto.randomUUID()) }
```

## 5. Command Services

Orchestrates the write flow — loads aggregate, calls aggregate method, persists. Business rules stay in the aggregate.

```ts
export class CreateOrderService {
  public constructor(private readonly repository: IOrderRepository) {}

  public async execute(command: CreateOrderCommand): Promise<string> {
    const existing = await this.repository.findByCode(command.code)
    if (existing !== null) throw new InvalidArgumentError('Order already exists.')
    const order = OrderAggregate.create(new OrderIdVo(crypto.randomUUID()), command.code)
    await this.repository.save(order)
    return order.id.value
  }
}
```

## 6. Presentation Entry Points

Parse, validate, build Command or Query, delegate, respond. Zero business logic.

```ts
// HTTP
fastify.post<{ Body: ExampleBody }>('/examples', { schema }, async (req, reply) => {
  const command = new CreateExampleCommand(req.body.name)
  const id = await createExampleService.execute(command)
  return reply.status(201).send({ id })
})
```

```ts
// Socket — requester identity always sourced from socket.data, never from client payload
socket.on('example_event', async (payload: unknown) => {
  const parsed = examplePayloadSchema.safeParse(payload)
  if (!parsed.success) {
    socket.emit('error', { message: 'Invalid payload' })
    return
  }
  const requesterId = socket.data.playerId as string
  await exampleService.execute(new ExampleCommand(requesterId, parsed.data.value))
})
```

Socket.IO events emitted only from Presentation — never from Application or Domain.

## 7. Dependency Injection

No IoC container. All dependencies wired in `src/bootstrap.ts` via per-domain modules in `src/bootstrap/`. Services, Repositories, and Handlers never instantiate their own dependencies.

```ts
// Correct — bootstrap/game.ts
const repository = new GamePrismaRepository(prisma)
const service = new CreateGameService(repository)
app.register(createGameRoute(jwtService, service))

// Wrong — inside a Service
export class CreateGameService {
  private readonly repository = new GamePrismaRepository(prisma)
}
```

## 8. Cross-Module Communication

| From                | To                                                 | Permitted |
| ------------------- | -------------------------------------------------- | --------- |
| Any layer           | Own module internals                               | Yes       |
| Application Service | Another module's Facade                            | Yes       |
| Any layer           | Another module's Service, Repository, or Aggregate | No        |

```ts
// Correct
export class CreateOrderService {
  public constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly customerFacade: ICustomerFacade,
  ) {}
}

// Wrong
export class CreateOrderService {
  public constructor(private readonly customerService: CustomerService) {}
}
```
