# Categories Game — Business Specification

---

## 1. Users and Roles

### Guest (not logged in)

- Can join a game using a code + nickname visible to other players
- Cannot create games or be a host
- Can see the final results screen after the game ends
- Has no access to game history or statistics

### Logged-in Player

- Everything a guest can do, plus:
- Can create games and be a host
- Has access to a dashboard: game history, results, statistics
- Can manage their profile and account settings

### Host (logged-in player who created the game)

- Configures the game before it starts
- Participates in the game like any other player — has a nick, answers questions, earns points
- Has additional UI controls: **Start Game** button in lobby, **Next Round** and **End Game** buttons on the standings screen
- No special privileges during the verification phase — votes like everyone else
- Disconnecting does not immediately end the game — see Section 7

---

## 2. Creating, Joining and Lobby

- The start screen offers two paths: **Create Game** and **Join Game**
- **Joining as guest:** game code + nickname
- **Joining as logged-in player:** game code only (nickname taken from account)
- Creating: available only to logged-in users — redirects to configuration
- Maximum **20 players** per game

### Lobby

- Players join using a code + nickname (guests) or code only (logged-in)
- Nickname must be unique within the game — regardless of whether the player is logged in or a guest
- Players can only join before the game starts — joining after start is not possible
- No kick functionality — host cannot remove players from the lobby
- Host clicks **Start Game** when ready — no confirmation required from players
- The **Start Game** button is active when there is at least 1 player in the lobby (host alone can start in solo mode, e.g. for testing)
- If the host disconnects in the lobby — see Section 7 (Host Disconnection)

---

## 3. Game Configuration (host before start)

| Setting            | Description                                                              |
| ------------------ | ------------------------------------------------------------------------ |
| Number of rounds   | Set before start, cannot be changed during the game                      |
| Alphabet           | Several presets: PL (with diacritics), PL (without diacritics), EN, etc. |
| Categories         | Choose from default pool + host can add custom ones (for this game only) |
| Scoring            | Configurable by host (e.g. 15 / 10 / 5 pts)                              |
| Closing time       | Time remaining players get after the first player finishes (e.g. 15s)    |
| Verification timer | Time limit per answer during the verification phase                      |

---

## 4. Categories

- A global pool of default categories exists (e.g. Country, City, River, Plant, etc.)
- Host can add custom, non-predefined categories — these are saved for this game only and are not added to the global pool
- **Every category has a description** — helps players understand it and provides AI context for verification

---

## 5. Letters

- Alphabet preset chosen by host in configuration
- Letter is drawn automatically at the start of each round
- **Letters do not repeat within a single game**

---

## 6. Game Flow

### Phase Overview

```
LOBBY
  ↓ host clicks "Start Game" (min. 2 players including host)
ROUND_ANSWERING       ← letter drawn automatically, players fill in answers
  ↓ first player clicks "I'm done"
ROUND_CLOSING         ← countdown (e.g. 15s) for remaining players
  ↓ time runs out
AI_PROCESSING         ← short waiting screen while AI evaluates all answers
  ↓ AI done
VERIFICATION          ← synchronous voting, all players see the same screen
  ↓ all answers evaluated
STANDINGS             ← current ranking; host clicks "Next Round" or "End Game"
  ↓ if "Next Round" → back to ROUND_ANSWERING
  ↓ if "End Game" or final round completed
FINISHED              ← final results screen with full verification history
```

Special states:

- `WAITING_FOR_HOST` — host disconnected at any phase; game is paused (see Section 7)
- `CANCELLED` — all players left the session or host did not return in time

### ROUND_ANSWERING

1. Letter is drawn automatically — all players see it simultaneously
2. Players fill in answers for each category
3. Player can freely switch between categories until they submit
4. A counter shows how many players have already finished
5. First player clicks "I'm done" → `ROUND_CLOSING` begins
6. A player who reconnects during this phase can still fill in answers until the phase ends

### ROUND_CLOSING

1. A countdown (configured closing time, e.g. 15s) is shown to all remaining players
2. When time runs out — no one can edit answers anymore, phase moves to `AI_PROCESSING`

### AI_PROCESSING

1. All answers are sent to AI for evaluation
2. Players see a waiting screen while AI processes
3. Once AI finishes, `VERIFICATION` begins automatically

### VERIFICATION

1. All players see the **same screen synchronously** — answer by answer, player by player
2. For each answer AI displays:
   - A percentage score (e.g. 87%)
   - A short reasoning (e.g. "typo, but the word exists")
   - Detects duplicates despite typos, different spellings, or language variants
3. Each player votes on **other players' answers** — never their own
4. Players with empty answers (disconnected during ROUND_ANSWERING) appear in VERIFICATION with empty answers — other players vote on them normally, empty answers score 0 pts
5. Players can discuss before voting
6. Move to the next answer happens **automatically** — all players voted OR the timer expired
7. If a player is disconnected during voting — their vote is skipped; the answer proceeds after the timer

### Verification Result

- Final result = weighted sum of player votes + AI vote (AI counts as one player)
- Acceptance threshold: **≥ 50%** — ties pass

### STANDINGS

- Shown after every round
- Displays current player ranking with scores
- Host can click **Next Round** to continue or **End Game** to finish early
- After the final round, only **End Game** is available

### FINISHED

- All players — logged in and guests — see the final results screen
- Results include a player ranking with scores
- Players can browse the full verification history (answer by answer)

---

## 7. Disconnections and Sessions

### Reconnecting

- **Guest:** re-enters the game by providing the game code + exact same nickname used when joining. If the nick is wrong or forgotten — reconnection is not possible.
- **Logged-in player:** re-enters by providing the game code only (identified by account).
- Reconnect is handled via the same `POST /games/join` endpoint used for joining — the server detects it's a reconnect (game not in `lobby` status) and returns the existing `playerId`.
- After receiving `playerId`, the client connects via Socket.IO and emits `game:join_room` — the server then marks the player as connected.
- A reconnecting player returns to the current game state. Rounds missed during absence = empty answers, no backfilling allowed.
- A player who reconnects during ROUND_ANSWERING can still fill in answers until the phase ends.
- **One session per player** — a second connection (e.g. from another device) takes over the session; the first socket is disconnected.
- Game code is one-time — it expires when the game finishes.

### Voluntary Exit

- There is no "Leave Game" button — players exit by closing the browser tab or navigating away.
- This is handled as a standard disconnection on the server side (socket `disconnect` event).
- For non-host players: treated as disconnection — they can reconnect later using the game code + nick.
- For the host: treated as disconnection — see Host Disconnection below.

### Host Disconnection

- If the host disconnects at any phase, the game continues uninterrupted — timers keep running, phases advance automatically.
- All players see a banner: "Host disconnected — waiting X seconds".
- On STANDINGS screen: the "Next Round" button is disabled until the host reconnects.
- After the countdown expires, every player sees an **End Game** button.
- Any player clicking **End Game** transitions the game to `CANCELLED`.
- If the host reconnects before the countdown expires — the banner disappears and the game resumes normally (on STANDINGS, the "Next Round" button becomes active again).

### Player Disconnection

- A disconnected player can reconnect as described above.
- During VERIFICATION: a disconnected player's votes are skipped; affected answers proceed after the timer.
- If all non-host players leave or disconnect during an active game — the game transitions to `CANCELLED`.
- The game does not pause if the number of connected players drops during an active round — the round continues with remaining players.

---

## 8. History and Statistics (logged-in users only)

- Dashboard with a list of played games
- Detailed view of each game: answers, results, verifications
- Player statistics (to be defined in the future)

---

## 9. Open Questions (to be resolved in the future)

- Exact algorithm for weighting player votes vs. AI
- Detailed statistics on the dashboard
