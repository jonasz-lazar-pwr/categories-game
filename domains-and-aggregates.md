# Categories Game — Domains and Aggregates

---

## 1. Identity

Responsible for user accounts, authentication and profile. Other domains know the user only by `UserId`.

### Aggregate: `UserAggregate`

**Value Objects:**

- `UserId` — uuid
- `UserEmail` — format validation
- `UserNick` — min/max length, allowed characters

**State:**

- `id: UserId`
- `email: UserEmail`
- `nick: UserNick`
- `createdAt: Date`

**Methods:**

- `static create(id, email, nick)` — validates all fields
- `static restore(...)` — rehydration from persistence
- `changeNick(nick: UserNick)`

**Repository:** `UserRepository`

- `findById(id: UserId)`
- `findByEmail(email: UserEmail)`
- `save(user: UserAggregate)`

---

## 2. Game

Responsible for creating a game, configuration, lobby and the game lifecycle. Knows about rounds only as "round number X is running / finished".

### Aggregate: `GameAggregate`

**Value Objects:**

- `GameId` — uuid
- `GameCode` — 6 characters, unique join code, expires on game finish
- `GameStatus` — enum: `lobby | active | finished | cancelled`
- `RoundCount` — number of rounds (min 1, max 26 — number of letters in the alphabet)
- `AlphabetPreset` — enum: `PL_WITH_DIACRITICS | PL_WITHOUT_DIACRITICS | EN`

**Internal Entities (part of the aggregate):**

`PlayerEntry` — a player inside the game (logged-in or guest)

- `playerId: PlayerId` — uuid (generated for guests on join)
- `userId: UserId | null` — null if guest
- `nick: string` — unique within the game
- `isHost: boolean`
- `isConnected: boolean`
- `socketId: string | null` — overwritten on reconnect
- `score: number`

`CategoryConfig` — category selected for this game (snapshot at game start)

- `categoryId: CategoryId`
- `name: string`
- `description: string` — used by AI in Scoring

`ScoringConfig` — scoring configuration

- `uniqueOnlyPoints: number` — only player with that answer
- `uniquePoints: number` — unique answer
- `duplicatePoints: number` — answer shared by multiple players
- `closingTimeSeconds: number` — time given to remaining players after the first one finishes
- `verificationTimeoutSeconds: number` — time limit per answer during verification

**State:**

- `id: GameId`
- `code: GameCode`
- `status: GameStatus`
- `hostId: PlayerId`
- `alphabetPreset: AlphabetPreset`
- `roundCount: RoundCount`
- `usedLetters: string[]` — letters already used in this game
- `currentRoundNumber: number`
- `players: PlayerEntry[]`
- `categories: CategoryConfig[]`
- `scoringConfig: ScoringConfig`

**Methods:**

- `static create(id, code, hostId, config)`
- `static restore(...)`
- `addPlayer(playerId, userId, nick)` — max 20 players, nick unique in game, only in `lobby` status
- `kickPlayer(playerId, requesterId)` — only host can kick, only in `lobby` status
- `start()` — status must be `lobby`, min 2 players
- `cancel()` — cancels game when host leaves lobby, status → `cancelled`
- `drawLetter()` — draws a letter not present in `usedLetters`, adds it to the list
- `advanceRound()` — increments `currentRoundNumber`
- `finish()` — status → `finished`, code expires
- `updatePlayerScore(playerId, points)`
- `setPlayerConnected(playerId, isConnected)` — on reconnect overwrites socketId

**Repository:** `GameRepository`

- `findById(id: GameId)`
- `findByCode(code: GameCode)`
- `save(game: GameAggregate)`

### Standalone Entity: `Category` (default pool + custom)

**Value Objects:**

- `CategoryId` — uuid

**State:**

- `id: CategoryId`
- `name: string`
- `description: string`
- `isDefault: boolean` — true = built-in, false = created by a user

**Repository:** `CategoryRepository`

- `findAllDefault()`
- `findById(id: CategoryId)`
- `save(category: Category)`

---

## 3. Round

Responsible for the flow of a single round — collecting answers and managing the timer. Knows nothing about points.

### Aggregate: `RoundAggregate`

**Value Objects:**

- `RoundId` — uuid
- `RoundStatus` — enum: `answering | closing | verification | finished`
- `RoundLetter` — single character, must belong to the correct alphabet

**Internal Entities:**

`PlayerAnswers` — one player's set of answers in a round

- `playerId: PlayerId`
- `answers: Map<CategoryId, string>` — answer per category (can be empty)
- `submittedAt: Date | null` — null = not yet submitted

**State:**

- `id: RoundId`
- `gameId: GameId`
- `roundNumber: number`
- `letter: RoundLetter`
- `status: RoundStatus`
- `playerAnswers: PlayerAnswers[]`
- `closingDeadline: Date | null` — set when the first player finishes

**Methods:**

- `static create(id, gameId, roundNumber, letter, playerIds)` — initialises empty `PlayerAnswers` for each player
- `static restore(...)`
- `submitAnswers(playerId, answers)` — status must be `answering` or `closing`, player has not yet submitted
- `startClosing(deadline)` — first player finished, sets `closingDeadline`, status → `closing`
- `close()` — status → `verification`, blocks further answers
- `finish()` — status → `finished`
- `getSubmittedAnswers()` — returns all answers to pass to Scoring

**Repository:** `RoundRepository`

- `findById(id: RoundId)`
- `findByGameId(gameId: GameId)`
- `save(round: RoundAggregate)`

---

## 4. Scoring

Responsible for answer verification, voting, AI integration and score calculation.

### Aggregate: `VerificationAggregate`

**Value Objects:**

- `VerificationId` — uuid
- `VerificationStatus` — enum: `pending | in_progress | finished`
- `AiScore` — number 0–100, result from AI

**Internal Entities:**

`AnswerVerification` — verification of one answer from one player in one category

- `playerId: PlayerId`
- `categoryId: CategoryId`
- `value: string`
- `aiScore: AiScore | null` — null until AI responds
- `aiReasoning: string | null` — short AI justification
- `votes: Vote[]` — player votes
- `isAccepted: boolean | null` — null until resolved
- `isResolved: boolean` — true when all players voted OR timer expired

`VerificationCursor` — currently displayed answer (synchronous view for all players)

- `currentPlayerId: PlayerId`
- `currentCategoryId: CategoryId`

`Vote` — one player's vote during verification

- `voterId: PlayerId`
- `accepted: boolean`

**State:**

- `id: VerificationId`
- `roundId: RoundId`
- `gameId: GameId`
- `status: VerificationStatus`
- `cursor: VerificationCursor`
- `items: AnswerVerification[]`

**Methods:**

- `static create(id, roundId, gameId, answers, categories, timeoutSeconds)` — `timeoutSeconds` passed from `ScoringConfig` via Facade
- `static restore(...)`
- `setAiResult(playerId, categoryId, score, reasoning)`
- `castVote(voterId, playerId, categoryId, accepted)` — player cannot vote on their own answer
- `resolveItem(playerId, categoryId)` — calculates weighted result (votes + AI as one vote), sets `isAccepted`, threshold ≥ 50%
- `advanceCursor()` — moves `cursor` to the next answer, calls `resolveItem` for the current one
- `resolveAll()` — calls `resolveItem` for all items, status → `finished`
- `computeScores(scoringConfig)` — returns `Map<PlayerId, number>`

**Repository:** `VerificationRepository`

- `findById(id: VerificationId)`
- `findByRoundId(roundId: RoundId)`
- `save(verification: VerificationAggregate)`

---

## 5. Cross-domain Communication

| From    | To      | Via                          | What it passes                                            |
| ------- | ------- | ---------------------------- | --------------------------------------------------------- |
| Game    | Round   | `GameFacade`                 | round start, configuration (letter, categories, players)  |
| Round   | Scoring | `RoundFacade`                | closed answers for verification                           |
| Scoring | Game    | `ScoringFacade`              | points per player after verification completes            |
| Scoring | AI      | `AiService` (Infrastructure) | answer content + category description → score + reasoning |

---

## 6. Module Folder Structure

```
src/
├── Identity/
│   ├── Domain/
│   ├── Application/
│   ├── Infrastructure/
│   └── Presentation/
├── Game/
│   ├── Domain/
│   ├── Application/
│   ├── Infrastructure/
│   └── Presentation/
├── Round/
│   ├── Domain/
│   ├── Application/
│   ├── Infrastructure/
│   └── Presentation/
├── Scoring/
│   ├── Domain/
│   ├── Application/
│   ├── Infrastructure/
│   └── Presentation/
└── shared/
    ├── errors/
    │   ├── InvalidArgumentError.ts
    │   └── NotFoundError.ts
    └── types/
```
