# Categories Game — Domains and Aggregates

---

## 1. Identity

Responsible for user accounts, authentication and profile. Other domains know the user only by `UserId`.

### Aggregate: `UserAggregate`

**Value Objects:**

- `UserIdVo` — uuid
- `UserEmailVo` — format validation
- `UserNickVo` — min/max length, allowed characters
- `UserPasswordHashVo` — non-empty hashed password string

**State:**

- `id: UserIdVo`
- `email: UserEmailVo`
- `nick: UserNickVo`
- `passwordHash: UserPasswordHashVo`
- `createdAt: Date`

**Methods:**

- `static create(id, email, nick, passwordHash)` — validates all fields
- `static restore(...)` — rehydration from persistence
- `changeNick(nick: UserNickVo)`

**Repository:** `IUserRepository`

- `findById(id: UserIdVo)`
- `findByEmail(email: UserEmailVo)`
- `save(user: UserAggregate)`

---

## 2. Game

Responsible for creating a game, configuration, lobby and the game lifecycle. Knows about rounds only as "round number X is running / finished".

### Aggregate: `GameAggregate`

**Value Objects:**

- `GameIdVo` — uuid
- `GameCodeVo` — 6 characters, unique join code, expires on game finish
- `GameStatus` — const object + union type: `lobby | active | finished | cancelled`
- `RoundCountVo` — number of rounds (min 1, max 26)
- `AlphabetPreset` — const object + union type: `PL_WITH_DIACRITICS | PL_WITHOUT_DIACRITICS | EN`

**Internal Entities (part of the aggregate):**

`PlayerEntry` — a player inside the game (logged-in or guest)

- `playerId: PlayerIdVo` — uuid (generated for guests on join)
- `userId: UserIdVo | null` — null if guest
- `nick: string` — unique within the game (case-insensitive comparison)
- `isHost: boolean`
- `isConnected: boolean`
- `socketId: string | null` — overwritten on reconnect
- `score: number`

`CategoryConfig` — category selected for this game (snapshot at game start)

- `categoryId: CategoryIdVo`
- `name: string`
- `description: string` — used by AI in Scoring

`ScoringConfig` — scoring configuration

- `uniqueOnlyPoints: number` — only player with that answer
- `uniquePoints: number` — unique answer
- `duplicatePoints: number` — answer shared by multiple players
- `closingTimeSeconds: number` — time given to remaining players after the first one finishes
- `verificationTimeoutSeconds: number` — time limit per answer during verification
- `waitingForHostTimeoutSeconds: number` — countdown shown to players when host disconnects; after expiry players can cancel the game

- `id: GameIdVo`
- `code: GameCodeVo`
- `status: GameStatus`
- `hostId: PlayerIdVo`
- `alphabetPreset: AlphabetPreset`
- `roundCount: RoundCountVo`
- `usedLetters: string[]`
- `currentRoundNumber: number`
- `players: PlayerEntry[]`
- `categories: CategoryConfig[]`
- `scoringConfig: ScoringConfig`

**Methods:**

- `static create(id, code, hostId, config)`
- `static restore(...)`
- `addPlayer(playerId, userId, nick)` — max 20 players, nick unique in game (case-insensitive), only in `lobby` status; reconnect path does NOT go through this method — handled by `JoinGameService` directly via `setPlayerConnected()`
- `start()` — status must be `lobby`; no minimum player count enforced (solo allowed for testing)
- `cancel()` — status → `cancelled`; callable from `lobby` or `active`
- `drawLetter()` — draws a letter not in `usedLetters`, adds it to the list; throws if all letters exhausted
- `advanceRound()` — increments `currentRoundNumber`
- `finish()` — status must be `active`, status → `finished`, code expires
- `updatePlayerScore(playerId, points)`
- `setPlayerConnected(playerId, socketId, isConnected)` — on reconnect overwrites socketId; `socketId === null` means never connected (first join), `socketId !== null` means reconnect

**Repository:** `IGameRepository`

- `findById(id: GameIdVo)`
- `findByCode(code: GameCodeVo)`
- `save(game: GameAggregate)`

### Standalone Entity: `CategoryEntity` (default pool only)

**Value Objects:**

- `CategoryIdVo` — uuid

**State:**

- `id: CategoryIdVo`
- `name: string`
- `description: string`
- `isDefault: boolean` — always true; custom categories are not persisted globally

**Repository:** `ICategoryRepository`

- `findAllDefault()`
- `findById(id: CategoryIdVo)`
- `save(category: CategoryEntity)`

---

## 3. Round

Responsible for the flow of a single round — collecting answers and managing the timer. Knows nothing about points.

### Aggregate: `RoundAggregate`

**Value Objects:**

- `RoundIdVo` — uuid
- `RoundStatus` — const object + union type: `answering | closing | finished`
- `RoundLetterVo` — single character, must belong to the correct alphabet

**Internal Entities:**

`PlayerAnswers` — one player's set of answers in a round

- `playerId: PlayerIdVo`
- `answers: Map<CategoryIdVo, string>` — answer per category (can be empty string)
- `submittedAt: Date | null` — null = not yet submitted

**State:**

- `id: RoundIdVo`
- `gameId: GameIdVo`
- `roundNumber: number`
- `letter: RoundLetterVo`
- `status: RoundStatus`
- `playerAnswers: PlayerAnswers[]`
- `closingDeadline: Date | null` — set when the first player finishes

**Methods:**

- `static create(id, gameId, roundNumber, letter, playerIds)` — initialises empty `PlayerAnswers` for each player
- `static restore(...)`
- `submitAnswers(playerId, answers)` — status must be `answering` or `closing`, player has not yet submitted
- `startClosing(deadline)` — first player finished, sets `closingDeadline`, status → `closing`
- `close()` — status → `finished`, blocks further answers; players who never submitted keep empty answers (included in Scoring with 0 pts, shown in VERIFICATION)
- `hasAllSubmitted()` — returns true when every player has submitted; used by `SubmitAnswersService` to trigger closing
- `getSubmittedAnswers()` — returns all answers to pass to Scoring; unsubmitted players are included with empty answers

**Repository:** `IRoundRepository`

- `findById(id: RoundIdVo)`
- `findByGameId(gameId: GameIdVo)`
- `findClosingWithDeadlineAfter(now: Date)` — used on startup to recover timers for rounds still in `closing` state
- `save(round: RoundAggregate)`

---

## 4. Scoring

Responsible for answer verification, voting, AI integration and score calculation.

The Scoring flow has two distinct sub-phases:

1. **AI_PROCESSING** — all answers are sent to AI before verification begins; players wait on a loading screen
2. **VERIFICATION** — synchronous voting phase; all players see the same answer at the same time

### Aggregate: `VerificationAggregate`

**Value Objects:**

- `VerificationIdVo` — uuid
- `VerificationStatus` — const object + union type: `ai_processing | in_progress | finished`
- `AiScoreVo` — number 0–100, result from AI

**Internal Entities:**

`AnswerVerification` — verification of one answer from one player in one category

- `playerId: PlayerIdVo`
- `categoryId: CategoryIdVo`
- `value: string` — may be empty string for players who did not submit
- `aiScore: AiScoreVo | null` — null until AI responds; empty answers skip AI (score = 0)
- `aiReasoning: string | null` — short AI justification; null for empty answers
- `votes: Vote[]` — player votes
- `isAccepted: boolean | null` — null until resolved
- `isResolved: boolean` — true when all eligible voters voted OR timer expired

`VerificationCursor` — currently displayed answer (synchronous view for all players)

- `currentPlayerId: PlayerIdVo`
- `currentCategoryId: CategoryIdVo`

`Vote` — one player's vote during verification

- `voterId: PlayerIdVo`
- `accepted: boolean`

**State:**

- `id: VerificationIdVo`
- `roundId: RoundIdVo`
- `gameId: GameIdVo`
- `status: VerificationStatus`
- `cursor: VerificationCursor`
- `items: AnswerVerification[]`

**Methods:**

- `static create(id, roundId, gameId, answers)` — status starts as `ai_processing`; empty answers are included but flagged; cursor starts as null until first AI result arrives
- `static restore(...)`
- `setAiResult(playerId, categoryId, score, reasoning)` — sets score + reasoning; when all non-empty answers have AI results, status → `in_progress`
- `castVote(voterId, playerId, categoryId, accepted)` — only allowed in `in_progress`; player cannot vote on their own answer; disconnected player's vote is simply never cast
- `resolveItem(playerId, categoryId)` — calculates weighted result (votes + AI as one vote), sets `isAccepted`, threshold ≥ 50%; empty answers resolve immediately as rejected (0 pts)
- `advanceCursor()` — moves `cursor` to the next answer, calls `resolveItem` for the current one
- `resolveAll()` — calls `resolveItem` for all items, status → `finished`
- `computeScores(scoringConfig)` — returns `Map<PlayerIdVo, number>`

**Repository:** `IVerificationRepository`

- `findById(id: VerificationIdVo)`
- `findByRoundId(roundId: RoundIdVo)`
- `save(verification: VerificationAggregate)`
- `saveAiResult(itemId, aiScore, aiReasoning)` — partial update for a single AI result without rewriting the full aggregate

---

## 5. Cross-domain Communication

| From    | To      | Via                          | What it passes                                                         |
| ------- | ------- | ---------------------------- | ---------------------------------------------------------------------- |
| Game    | Round   | `GameFacade`                 | round start, configuration (letter, categories, players)               |
| Round   | Scoring | `RoundFacade`                | closed answers for AI processing + verification (including empty ones) |
| Scoring | Game    | `ScoringFacade`              | points per player after verification completes                         |
| Scoring | AI      | `AiService` (Infrastructure) | answer content + category description → score + reasoning              |

---

## 6. Module Folder Structure

```
src/
├── Identity/
│   ├── Application/
│   │   ├── CommandDto/
│   │   ├── ReadDto/
│   │   ├── View/
│   │   └── (services + queries directly here)
│   ├── Domain/
│   │   ├── ValueObjects/
│   │   └── (aggregate + repository interface directly here)
│   └── Infrastructure/
│       ├── Prisma/
│       └── (infrastructure services directly here)
├── Game/
├── Round/
├── Scoring/
├── Presentation/
│   ├── Identity/
│   │   └── __tests__/
│   ├── Game/
│   │   └── __tests__/
│   ├── Round/
│   │   └── __tests__/
│   ├── Scoring/
│   │   └── __tests__/
│   └── shared/         ← SocketData type guard, shared Presentation utilities
├── bootstrap/
│   ├── http.ts
│   ├── identity.ts
│   ├── game.ts
│   ├── socket.ts
│   ├── round.ts
│   └── scoring.ts
└── shared/
    ├── errors/
    │   ├── InvalidArgumentError.ts
    │   ├── ConflictError.ts
    │   └── NotFoundError.ts
    ├── logger.ts
    ├── types/
    │   └── FastifyTypes.ts
    └── ValueObjects/
        └── PlayerIdVo.ts
```
